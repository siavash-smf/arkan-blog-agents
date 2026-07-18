import "server-only";
import { randomUUID } from "crypto";
import { getStore, type PipelineRun, type SocialPost } from "@/lib/store";
import { makeStepRunner } from "./run-steps";
import { prepareReelsSource } from "./reels-source";
import { runReelsWriter, runReelsRevision } from "./reels-writer";
import { SOCIAL_APPROVE_THRESHOLD } from "./social-editor";
import { runReelsChecks } from "./social-checks";
import { writeAndReview } from "./social-loop";
import { availableCtas } from "./reels-cta";
import { runSocialCritic } from "./critic";
import type { ReelsSource } from "./reels-source";
import type { ReelsScript, SocialBrief } from "./types";

/**
 * ارکستریتور ریلز — پایپ‌لاین چهارم سیستم.
 *
 * از یک لینک یا یک متن، اسکریپت ریلز می‌سازد که بعداً از رویش ویدیو ضبط شود.
 *
 * جریان:
 * تهیه‌ی منبع (کد قطعی) → کپی‌رایتر ریلز ⇄ ویراستار → ناشر → منتقد
 *
 * دو نکته‌ی طراحی:
 *
 * ۱. گام اول ایجنت نیست. گرفتن HTML و تمیزکردنش هیچ قضاوتی لازم ندارد، پس
 *    کد انجامش می‌دهد. مدل جایی وارد می‌شود که باید تصمیم بگیرد «کدام نکته
 *    ارزش یک ویدیو دارد».
 *
 * ۲. اینجا استراتژیست نداریم. در پایپ‌لاین اینستاگرام، استراتژیست از میان
 *    چند ایده یکی را انتخاب می‌کرد؛ اینجا ورودی خودش یک محتوای مشخص است و
 *    انتخابی در کار نیست. ایجنت اضافه‌کردن فقط برای «تقارن با بقیه»،
 *    پیچیدگی بی‌دلیل است.
 */
export async function runReelsPipeline(opts: {
  runId: string;
  sourceUrl?: string | null;
  sourceText?: string | null;
  leadMagnet?: string | null;
}): Promise<PipelineRun> {
  const store = getStore();
  const runId = opts.runId;
  const leadMagnet = opts.leadMagnet?.trim() || null;

  const run: PipelineRun = {
    id: runId,
    kind: "reels",
    status: "running",
    // موضوع اجرا در تاریخچه: لینک یا آغاز متن ورودی
    topicHint:
      opts.sourceUrl?.trim() ||
      (opts.sourceText?.trim() ? `${opts.sourceText.trim().slice(0, 80)}…` : null),
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
    // ── ۱. تهیه‌ی منبع — کد قطعی، بدون LLM ──
    // متن کامل را در متغیر بیرونی نگه می‌داریم و در output فقط پیش‌نمایش
    // می‌گذاریم؛ وگرنه کل مقاله در هر رکورد گام تکرار می‌شد.
    let source!: ReelsSource;
    await step("reels-source", "تهیه‌ی منبع", async () => {
      source = await prepareReelsSource({
        sourceUrl: opts.sourceUrl,
        sourceText: opts.sourceText,
      });
      return {
        output: {
          origin: source.origin,
          chars: source.text.length,
          preview: source.text.slice(0, 500),
        },
        summary: `${source.origin} — ${source.text.length} کاراکتر متن استخراج شد`,
      };
    });

    const allowedCtaIds = availableCtas(Boolean(leadMagnet)).map((c) => c.id);

    /**
     * ویراستار اجتماعی یک `SocialBrief` می‌خواهد تا بداند محتوا قرار بوده
     * چه بگوید. ریلز بریف جدا ندارد (ورودی‌اش خودش محتواست)، پس یک بریف
     * حداقلی از منبع می‌سازیم. این یک «آداپتور» است، نه یک ایجنت — و
     * صادقانه‌تر از آن است که ویراستار را مجبور کنیم بدون زمینه قضاوت کند.
     */
    const brief: SocialBrief = {
      coreMessage: `اسکریپت ریلز بر اساس: ${source.origin}`,
      audience: "مدیران و مالکان کسب‌وکارهای کوچک و متوسط ایرانی",
      keyPoints: [],
      hookAngle: "قلاب باید در سه تا پنج ثانیه‌ی اول مخاطب را متوقف کند",
      proofPoint: source.text.slice(0, 1500),
      cta: `یکی از این‌ها: ${allowedCtaIds.join("، ")}`,
    };

    // ── ۲ و ۳. کپی‌رایتر ریلز ⇄ ویراستار (حلقه‌ی مشترک) ──
    const reels = await writeAndReview<ReelsScript>({
      step,
      channel: "reels",
      writerAgent: "reels-writer",
      label: "ریلز",
      brief,
      write: () => runReelsWriter({ source, leadMagnet }),
      revise: (draft, review, failedChecks) =>
        runReelsRevision({ source, leadMagnet, draft, review, failedChecks }),
      check: (d) =>
        runReelsChecks({
          hook: d.hook,
          body: d.body,
          cta: d.cta,
          ctaId: d.ctaId,
          onScreenText: d.onScreenText,
          hashtags: d.hashtags,
          allowedCtaIds,
        }),
      describe: (d) =>
        `${`${d.hook} ${d.body} ${d.cta}`.trim().split(/\s+/).length} کلمه، CTA: ${d.ctaId}`,
    });

    // ── ۴. ناشر — کد قطعی ──
    const published = await step("social-publisher", "ناشر محتوای اجتماعی", async () => {
      const d = reels.draft;
      const now = new Date().toISOString();

      // چسباندن سه بخش، کارِ کد است نه مدل: ترتیب همیشه یکی است و
      // نویسنده نباید انرژی‌اش را صرف قالب‌بندی کند.
      const script = `${d.hook}\n\n${d.body}\n\n${d.cta}`;

      // نویسنده گاهی با وجود تذکر، هشتگ‌ها را داخل کپشن هم می‌گذارد و
      // چون هنگام کپی، هشتگ‌های فیلد جدا به انتها اضافه می‌شوند، تکراری
      // می‌شد. پاک‌کردنش کاملاً مکانیکی است — پس با کد، نه با یک دور
      // بازنویسیِ گران.
      const caption = d.caption
        .replace(/^\s*#[^\s#]+(\s+#[^\s#]+)*\s*$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      const post: SocialPost = {
        id: randomUUID(),
        runId,
        sourcePostId: null,
        // ریلز روی اینستاگرام منتشر می‌شود؛ format فرقش را می‌گوید
        platform: "instagram",
        format: "reels",
        title: d.title,
        body: script,
        slides: [],
        hashtags: d.hashtags,
        cta: d.cta,
        checks: reels.checks,
        extras: {
          onScreenText: d.onScreenText,
          caption,
          ctaReason: d.ctaReason,
        },
        score: reels.review.score,
        status: "draft",
        createdAt: now,
        approvedAt: null,
      };
      await store.createSocialPost(post);

      const words = script.trim().split(/\s+/).length;
      return {
        output: { reelsId: post.id, words, ctaId: d.ctaId },
        summary:
          reels.review.score >= SOCIAL_APPROVE_THRESHOLD
            ? `اسکریپت ${words} کلمه‌ای ذخیره شد — آماده‌ی ضبط`
            : `اسکریپت ذخیره شد (امتیاز ${reels.review.score} زیر حد نصاب — نیاز به بازبینی انسانی)`,
      };
    });

    run.socialPostIds = [published.reelsId];
    await store.updateRun(runId, { socialPostIds: run.socialPostIds });

    // ── ۵. منتقد (خودبهبودی) ──
    await step<unknown>("critic", "منتقد — استخراج درس", async () => {
      try {
        const out = await runSocialCritic({
          context: `نوع اجرا: اسکریپت ریلز از ${source.origin}`,
          parts: [{ label: "اسکریپت ریلز", ...reels }],
          revisionRounds: reels.revisionRounds,
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
