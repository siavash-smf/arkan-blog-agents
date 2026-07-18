import "server-only";
import { randomUUID } from "crypto";
import { getStore, type PipelineRun, type SocialPost } from "@/lib/store";
import { makeStepRunner } from "./run-steps";
import { runSocialIdeaScout } from "./social-idea-scout";
import { runLinkedinAngleFinder } from "./linkedin-angle-finder";
import { runLinkedinWriter, runLinkedinRevision } from "./linkedin-writer";
import { SOCIAL_APPROVE_THRESHOLD } from "./social-editor";
import { runLinkedinChecks } from "./social-checks";
import { writeAndReview } from "./social-loop";
import { runSocialCritic } from "./critic";
import type { LinkedInPost, SocialIdea } from "./types";

/**
 * ارکستریتور لینکدین — پایپ‌لاین پنجم سیستم.
 *
 * جریان:
 * [ایده‌یاب اجتماعی، فقط اگر مشاهده‌ای نباشد] → زاویه‌یاب لینکدین
 * → کپی‌رایتر ⇄ ویراستار → ناشر → منتقد
 *
 * تفاوت واقعی این پایپ‌لاین با کاروسل مستقل در ماده‌ی خام است، نه در
 * ساختار: پست لینکدینِ خوب از مشاهده‌ی دست‌اول مشاور می‌آید. برای همین
 * ورودی اصلی «مشاهده» است و ایده‌یاب فقط نقش جایگزین دارد.
 */
export async function runLinkedinPipeline(opts: {
  runId: string;
  /** مشاهده‌ی این هفته — منبع ترجیحی */
  observation?: string | null;
  /**
   * آیا مشاهده را انسان نوشته؟ پیش‌فرض بله (ورودی مستقیم استودیو).
   * کمپین این را false می‌فرستد، چون زاویه‌اش را خودِ مدل ساخته.
   */
  observationIsTrusted?: boolean;
  topicHint?: string | null;
}): Promise<PipelineRun> {
  const store = getStore();
  const runId = opts.runId;
  const observation = opts.observation?.trim() || null;
  const topicHint = opts.topicHint?.trim() || null;

  const run: PipelineRun = {
    id: runId,
    kind: "linkedin",
    status: "running",
    topicHint: observation ? `${observation.slice(0, 80)}…` : topicHint,
    steps: [],
    postId: null,
    sourcePostId: null,
    socialPostIds: [],
    error: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };
  await store.createRun(run);

  const step = makeStepRunner(run);

  try {
    // ── ۱. ایده‌یاب — فقط وقتی مشاهده‌ای در کار نیست ──
    // این تنها شاخه‌ی این ارکستریتور است و دلیل روشنی دارد: با مشاهده،
    // تولید ایده هم بی‌فایده است هم گمراه‌کننده.
    let ideas: SocialIdea[] = [];
    if (!observation) {
      const existing = await store.listSocialPosts({ platform: "linkedin" });
      ideas = await step("social-idea-scout", "ایده‌یاب اجتماعی", async () => {
        const out = await runSocialIdeaScout({
          topicHint,
          existingTitles: existing.map((p) => p.title),
        });
        return {
          output: out,
          summary: `${out.length} ایده تولید شد؛ بهترین: «${out[0].title}»`,
        };
      });
    }

    // ── ۲. زاویه‌یاب لینکدین ──
    const brief = await step("linkedin-angle-finder", "زاویه‌یاب لینکدین", async () => {
      const out = await runLinkedinAngleFinder({
        observation,
        observationIsTrusted: opts.observationIsTrusted ?? true,
        ideas,
      });
      return {
        output: out,
        summary: observation
          ? `زاویه از مشاهده‌ی شما استخراج شد — ${out.keyPoints.length} نکته`
          : `زاویه از ایده‌های ایده‌یاب ساخته شد — ${out.keyPoints.length} نکته`,
      };
    });

    // ── ۳ و ۴. کپی‌رایتر ⇄ ویراستار (حلقه‌ی مشترک) ──
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

    // ── ۵. ناشر — کد قطعی ──
    const published = await step("social-publisher", "ناشر محتوای اجتماعی", async () => {
      const now = new Date().toISOString();
      const post: SocialPost = {
        id: randomUUID(),
        runId,
        sourcePostId: null,
        platform: "linkedin",
        format: "post",
        title: li.draft.title,
        body: li.draft.body,
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
      await store.createSocialPost(post);

      return {
        output: { linkedinId: post.id },
        summary:
          li.review.score >= SOCIAL_APPROVE_THRESHOLD
            ? "پست ذخیره شد — آماده‌ی تأیید و انتشار دستی"
            : `پست ذخیره شد (امتیاز ${li.review.score} زیر حد نصاب — نیاز به بازبینی انسانی)`,
      };
    });

    run.socialPostIds = [published.linkedinId];
    await store.updateRun(runId, { socialPostIds: run.socialPostIds });

    // ── ۶. منتقد (خودبهبودی) ──
    await step<unknown>("critic", "منتقد — استخراج درس", async () => {
      try {
        const out = await runSocialCritic({
          context: `نوع اجرا: پست مستقل لینکدین${observation ? " — بر پایه‌ی مشاهده‌ی اپراتور" : " (بدون مشاهده، از ایده‌یاب)"}`,
          parts: [{ label: "پست لینکدین", ...li }],
          revisionRounds: li.revisionRounds,
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
