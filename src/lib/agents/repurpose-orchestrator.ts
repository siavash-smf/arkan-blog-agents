import "server-only";
import { randomUUID } from "crypto";
import { getStore, type PipelineRun, type SocialPost } from "@/lib/store";
import { makeStepRunner } from "./run-steps";
import { runRepurposer } from "./repurposer";
import { runInstagramWriter, runInstagramRevision } from "./instagram-writer";
import { runLinkedinWriter, runLinkedinRevision } from "./linkedin-writer";
import { SOCIAL_APPROVE_THRESHOLD } from "./social-editor";
import { runInstagramChecks, runLinkedinChecks } from "./social-checks";
import { writeAndReview } from "./social-loop";
import { runSocialCritic } from "./critic";
import type { InstagramCarousel, LinkedInPost } from "./types";

/**
 * ارکستریتور بازآفرینی — پایپ‌لاین دوم سیستم.
 *
 * از یک مقاله‌ی منتشرشده، یک کاروسل اینستاگرام و یک پست لینکدین می‌سازد.
 *
 * چرا فایل جدا و نه یک if داخل runPipeline؟ چون خوانایی آن ۸ گام خطی، کل
 * ارزش آموزشی آن فایل است. یک شاخه‌ی if آن را دو برابر و پیچیده می‌کرد.
 * اشتراک واقعی بین دو ارکستریتور در makeStepRunner است، نه در بدنه‌شان.
 *
 * جریان:
 * بازآفرین → کپی‌رایتر اینستاگرام ⇄ ویراستار → کپی‌رایتر لینکدین ⇄ ویراستار
 * → ناشر (کد قطعی) → منتقد
 *
 * برخلاف پایپ‌لاین بلاگ، اینجا idea-scout و researcher نداریم: مقاله‌ی
 * مبدأ خودش نتیجه‌ی پژوهش است.
 */


export async function runRepurpose(opts: {
  runId: string;
  sourcePostId: string;
}): Promise<PipelineRun> {
  const store = getStore();
  const runId = opts.runId;

  const run: PipelineRun = {
    id: runId,
    kind: "repurpose",
    status: "running",
    topicHint: null,
    steps: [],
    postId: null,
    sourcePostId: opts.sourcePostId,
    socialPostIds: [],
    error: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };
  await store.createRun(run);

  const step = makeStepRunner(run);

  try {
    const source = await store.getPost(opts.sourcePostId);
    if (!source) throw new Error("پست مبدأ پیدا نشد.");
    if (source.status !== "published") {
      throw new Error("فقط از پست منتشرشده می‌توان محتوای اجتماعی ساخت.");
    }

    // ── ۱. بازآفرین ──
    const brief = await step("repurposer", "بازآفرین محتوا", async () => {
      const out = await runRepurposer({ post: source });
      return {
        output: out,
        summary: `پیام مرکزی استخراج شد — ${out.keyPoints.length} نکته‌ی کلیدی`,
      };
    });

    // ⚠️ اینستاگرام و لینکدین عمداً **متوالی** اجرا می‌شوند، نه با Promise.all.
    // موازی سریع‌تر بود، ولی run.steps یک آرایه‌ی mutable مشترک است که دو
    // زنجیره‌ی درهم‌بافته رویش updateRun می‌زنند؛ last-write-wins گام‌ها را
    // می‌انداخت و تایم‌لاین زنده می‌پرید. همزمانی و state مشترک با هم جور
    // درنمی‌آیند — و اینجا سرعت ارزش این پیچیدگی را ندارد.

    // ── ۲. کپی‌رایتر اینستاگرام ⇄ ویراستار ──
    const ig = await writeAndReview<InstagramCarousel>({
      step,
      channel: "instagram",
      writerAgent: "instagram-writer",
      label: "اینستاگرام",
      brief,
      write: () => runInstagramWriter({ brief }),
      revise: (draft, review, failedChecks) =>
        runInstagramRevision({ brief, draft, review, failedChecks }),
      check: (d) =>
        runInstagramChecks({ caption: d.caption, slides: d.slides, hashtags: d.hashtags }),
      describe: (d) => `${d.slides.length} اسلاید، ${d.hashtags.length} هشتگ`,
    });

    // ── ۳. کپی‌رایتر لینکدین ⇄ ویراستار ──
    const li = await writeAndReview<LinkedInPost>({
      step,
      channel: "linkedin",
      writerAgent: "linkedin-writer",
      label: "لینکدین",
      brief,
      write: () => runLinkedinWriter({ brief }),
      revise: (draft, review, failedChecks) =>
        runLinkedinRevision({ brief, draft, review, failedChecks }),
      check: (d) => runLinkedinChecks({ body: d.body, hashtags: d.hashtags }),
      describe: (d) => `${[...d.body].length} کاراکتر، ${d.hashtags.length} هشتگ`,
    });

    // ── ۴. ناشر — کد قطعی، بدون LLM ──
    const published = await step("social-publisher", "ناشر محتوای اجتماعی", async () => {
      const now = new Date().toISOString();

      const igPost: SocialPost = {
        id: randomUUID(),
        runId,
        sourcePostId: source.id,
        platform: "instagram",
        format: "carousel",
        title: ig.draft.title,
        body: ig.draft.caption,
        slides: ig.draft.slides,
        hashtags: ig.draft.hashtags,
        cta: ig.draft.cta,
        checks: ig.checks,
        extras: {},
        score: ig.review.score,
        // همیشه draft: انتشار روی شبکه‌ی اجتماعی دستی است و باید انسان
        // تأییدش کند (human-in-the-loop، مثل ناشر بلاگ).
        status: "draft",
        createdAt: now,
        approvedAt: null,
      };

      const liPost: SocialPost = {
        id: randomUUID(),
        runId,
        sourcePostId: source.id,
        platform: "linkedin",
        format: "post",
        title: li.draft.title,
        body: li.draft.body,
        // پست لینکدین اسلاید ندارد — این قرارداد در constraint جدول هم قفل است
        slides: [],
        hashtags: li.draft.hashtags,
        cta: li.draft.cta,
        checks: li.checks,
        extras: {},
        score: li.review.score,
        status: "draft",
        createdAt: now,
        approvedAt: null,
      };

      await store.createSocialPost(igPost);
      await store.createSocialPost(liPost);

      const belowBar = [ig.review, li.review].filter(
        (r) => r.score < SOCIAL_APPROVE_THRESHOLD
      ).length;

      return {
        output: { instagramId: igPost.id, linkedinId: liPost.id },
        summary:
          belowBar === 0
            ? "دو محتوا ذخیره شد — آماده‌ی تأیید و انتشار دستی"
            : `دو محتوا ذخیره شد (${belowBar} مورد زیر حد نصاب — نیاز به بازبینی انسانی)`,
      };
    });

    run.socialPostIds = [published.instagramId, published.linkedinId];
    await store.updateRun(runId, { socialPostIds: run.socialPostIds });

    // ── ۵. منتقد (خودبهبودی) ──
    // مثل پایپ‌لاین بلاگ: خطای منتقد نباید اجرای موفق را خراب کند.
    await step<unknown>("critic", "منتقد — استخراج درس", async () => {
      try {
        const out = await runSocialCritic({
          context: `نوع اجرا: بازآفرینی از مقاله‌ی «${source.title}»`,
          parts: [
            { label: "کاروسل اینستاگرام", ...ig },
            { label: "پست لینکدین", ...li },
          ],
          revisionRounds: ig.revisionRounds + li.revisionRounds,
        });
        return {
          output: out,
          summary: `امتیاز کلی ${out.overallScore}/100 — ${out.lessons.length} درس برای اجراهای بعدی ذخیره شد`,
        };
      } catch (err) {
        return {
          output: { error: err instanceof Error ? err.message : String(err) },
          summary: "استخراج درس ناموفق بود (اجرای اصلی سالم است)",
        };
      }
    });

    run.status = "done";
    run.finishedAt = new Date().toISOString();
    await store.updateRun(runId, { status: "done", finishedAt: run.finishedAt });
    return run;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    run.status = "error";
    run.error = message;
    run.finishedAt = new Date().toISOString();
    await store.updateRun(runId, {
      status: "error",
      error: message,
      finishedAt: run.finishedAt,
    });
    return run;
  }
}

