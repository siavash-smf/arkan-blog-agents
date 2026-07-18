import "server-only";
import { randomUUID } from "crypto";
import { getStore, type PipelineRun, type Post } from "@/lib/store";
import { makeStepRunner } from "./run-steps";
import { runIdeaScout } from "./idea-scout";
import { runStrategist } from "./strategist";
import { runResearcher } from "./researcher";
import { runWriter, runWriterRevision } from "./writer";
import { runEditor, APPROVE_THRESHOLD } from "./editor";
import { runSeo } from "./seo";
import { runCritic } from "./critic";
import type { Review } from "./types";

/**
 * ارکستریتور — رهبر ارکستر پایپ‌لاین.
 *
 * نکته‌ی آموزشی مهم: ارکستریتور خودش LLM نیست؛ کد قطعی است.
 * «تصمیم‌های خلاقانه» با ایجنت‌هاست، ولی «جریان کار» (ترتیب، حلقه‌ی
 * بازبینی، شرط‌ها، ثبت وضعیت) با کد معمولی — چون جریان کار باید
 * قابل پیش‌بینی، قابل دیباگ و قابل تست باشد. رایج‌ترین اشتباه در
 * ساخت مولتی‌ایجنت این است که orchestration را هم به LLM بسپارید.
 *
 * جریان:
 * ایده‌یاب → استراتژیست → پژوهشگر → نویسنده ⇄ ویراستار (حداکثر ۲ دور
 * بازنویسی) → سئو → ناشر → منتقد (استخراج درس برای اجراهای بعد)
 *
 * هر گام بلافاصله در store ثبت می‌شود تا استودیو بتواند پیشرفت را
 * زنده نمایش دهد (الگوی «وضعیت در دیتابیس، نه در حافظه»).
 */

const MAX_REVISION_ROUNDS = 2;

export async function runPipeline(opts: {
  runId: string;
  topicHint?: string | null;
}): Promise<PipelineRun> {
  const store = getStore();
  const runId = opts.runId;
  const topicHint = opts.topicHint?.trim() || null;

  const run: PipelineRun = {
    id: runId,
    kind: "blog",
    status: "running",
    topicHint,
    steps: [],
    postId: null,
    // این دو فقط برای اجرای بازآفرینی معنی دارند
    sourcePostId: null,
    socialPostIds: [],
    error: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };
  await store.createRun(run);

  // ثبت زنده‌ی گام‌ها — پیاده‌سازی مشترک با ارکستریتور بازآفرینی
  const step = makeStepRunner(run);

  try {
    const existingPosts = await store.listPosts();

    // ── ۱. ایده‌یاب ──
    const ideas = await step("idea-scout", "ایده‌یاب", async () => {
      const out = await runIdeaScout({
        topicHint,
        existingTitles: existingPosts.map((p) => p.title),
      });
      return { output: out, summary: `${out.length} ایده تولید شد؛ بهترین: «${out[0].title}»` };
    });

    // ── ۲. استراتژیست ──
    const brief = await step("strategist", "استراتژیست محتوا", async () => {
      const out = await runStrategist({ ideas, topicHint });
      return {
        output: out,
        summary: `بریف «${out.title}» — کلیدواژه: ${out.primaryKeyword}، ${out.outline.length} بخش`,
      };
    });

    // ── ۳. پژوهشگر ──
    const research = await step("researcher", "پژوهشگر", async () => {
      const out = await runResearcher({ brief });
      const web = process.env.TAVILY_API_KEY ? " (با جستجوی وب)" : " (بدون جستجوی وب)";
      return {
        output: out,
        summary: `${out.keyFacts.length} فکت و ${out.commonQuestions.length} سؤال رایج${web}`,
      };
    });

    // ── ۴ و ۵. نویسنده ⇄ ویراستار (حلقه‌ی بازبینی) ──
    let draft = await step("writer", "نویسنده — پیش‌نویس اول", async () => {
      const out = await runWriter({ brief, research });
      return { output: out, summary: `پیش‌نویس ${out.split(/\s+/).length} کلمه‌ای نوشته شد` };
    });

    let review: Review = await step("editor", "ویراستار — بازبینی اول", async () => {
      const out = await runEditor({ brief, draft });
      return {
        output: out,
        summary: `امتیاز ${out.score}/100 — ${out.verdict === "approve" ? "تأیید شد" : `${out.issues.length} ایراد، نیاز به بازنویسی`}`,
      };
    });

    let revisionRounds = 0;
    while (review.verdict === "revise" && revisionRounds < MAX_REVISION_ROUNDS) {
      revisionRounds++;
      const round = revisionRounds;

      draft = await step("writer", `نویسنده — بازنویسی ${round}`, async () => {
        const out = await runWriterRevision({ brief, research, draft, review });
        return { output: out, summary: `بازنویسی بر اساس ${review.issues.length} ایراد ویراستار` };
      });

      review = await step("editor", `ویراستار — بازبینی ${round + 1}`, async () => {
        const out = await runEditor({ brief, draft });
        return {
          output: out,
          summary: `امتیاز ${out.score}/100 — ${out.verdict === "approve" ? "تأیید شد" : "هنوز ایراد دارد"}`,
        };
      });
    }
    // نکته: اگر بعد از سقف بازنویسی هنوز revise بود، ادامه می‌دهیم اما پست
    // «پیش‌نویس» می‌ماند تا انسان تصمیم نهایی را بگیرد (human-in-the-loop).

    // ── ۶. متخصص سئو ──
    const { seo, checks } = await step("seo", "متخصص سئو", async () => {
      const out = await runSeo({
        brief,
        contentMd: draft,
        existingSlugs: existingPosts.map((p) => p.slug),
      });
      const passed = out.checks.filter((c) => c.pass).length;
      return {
        output: out,
        summary: `متادیتا ساخته شد — چک‌لیست: ${passed}/${out.checks.length} پاس`,
      };
    });

    // ── ۷. ناشر ──
    const approved = review.verdict === "approve" && review.score >= APPROVE_THRESHOLD;
    const post = await step("publisher", "ناشر", async () => {
      const now = new Date().toISOString();
      const p: Post = {
        id: randomUUID(),
        runId,
        title: brief.title,
        slug: seo.slug,
        excerpt: seo.excerpt,
        contentMd: draft,
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        keywords: seo.keywords,
        faq: seo.faq,
        score: review.score,
        status: approved ? "published" : "draft",
        createdAt: now,
        publishedAt: approved ? now : null,
      };
      await store.createPost(p);
      return {
        output: { postId: p.id, slug: p.slug, status: p.status },
        summary: approved
          ? `منتشر شد: /blog/${p.slug}`
          : `به‌عنوان پیش‌نویس ذخیره شد (امتیاز ${review.score} — نیاز به تأیید انسانی)`,
      };
    });

    run.postId = post.postId;
    await store.updateRun(runId, { postId: post.postId });

    // ── ۸. منتقد (خودبهبودی) ──
    // خطای منتقد نباید اجرای موفق را خراب کند؛ درس‌گرفتن «تلاش حداکثری» است.
    await step<unknown>("critic", "منتقد — استخراج درس", async () => {
      try {
        const fullPost = (await store.getPost(post.postId))!;
        const out = await runCritic({
          post: fullPost,
          editorReview: review,
          seoChecks: checks,
          revisionRounds,
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
