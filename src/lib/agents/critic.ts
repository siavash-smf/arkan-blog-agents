import "server-only";
import { randomUUID } from "crypto";
import { z } from "zod";
import { runAgentJSON } from "@/lib/ai";
import { getStore, type Post } from "@/lib/store";
import {
  CriticOutputSchema,
  AGENT_IDS,
  type CriticOutput,
  type Review,
  type SocialReview,
} from "./types";
import type { SeoCheck } from "./seo-checks";
import type { SocialCheck } from "./social-checks";

/**
 * ایجنت ۸ — منتقد (Critic) — موتور خودبهبودی سیستم
 *
 * دو ورودی دارد:
 * ۱. بعد از هر اجرای پایپ‌لاین: کل فرایند را مرور می‌کند و حداکثر ۳ «درس»
 *    استخراج می‌کند — هر درس خطاب به یک ایجنت مشخص.
 * ۲. بازخورد انسانی روی پست‌ها: آن را به درس قابل‌اجرا تبدیل می‌کند.
 *
 * درس‌ها در store ذخیره می‌شوند و lessons.ts آن‌ها را در اجراهای بعدی به
 * پرامپت همان ایجنت تزریق می‌کند. این حلقه‌ی بسته = یادگیری در طول زمان،
 * بدون fine-tuning و بدون تغییر کد.
 */

const MAX_ACTIVE_LESSONS_PER_AGENT = 8;

async function saveLessons(
  lessons: { agent: string; lesson: string }[],
  source: "critic" | "human"
) {
  const store = getStore();
  for (const l of lessons) {
    await store.addLesson({
      id: randomUUID(),
      agent: l.agent,
      lesson: l.lesson,
      source,
      active: true,
      createdAt: new Date().toISOString(),
    });

    // سقف حافظه: قدیمی‌ترین درس‌های اضافه غیرفعال می‌شوند تا پرامپت‌ها متورم نشوند
    const active = await store.listLessons({ agent: l.agent, activeOnly: true });
    for (const old of active.slice(MAX_ACTIVE_LESSONS_PER_AGENT)) {
      await store.deactivateLesson(old.id);
    }
  }
}

export async function runCritic(input: {
  post: Post;
  editorReview: Review;
  seoChecks: SeoCheck[];
  revisionRounds: number;
}): Promise<CriticOutput> {
  const system = `تو «منتقد» سیستم تولید محتوای آرکان هستی. کارت بهبود خودِ سیستم است، نه این مقاله‌ی خاص. از هر اجرا الگو استخراج می‌کنی: چه چیزی خوب کار کرد، چه چیزی نه، و کدام ایجنت باید دفعه‌ی بعد چه‌کار متفاوتی بکند.

ایجنت‌های سیستم: ${AGENT_IDS.join(", ")}

قاعده‌ی طلایی درس خوب: کوتاه، قابل‌اجرا و عمومی (برای همه‌ی مقاله‌های آینده، نه فقط این یکی). مثال خوب: «writer: در مقدمه به‌جای کلی‌گویی، با یک مسئله‌ی ملموس مخاطب شروع کن». مثال بد: «مقاله خوب بود».`;

  const failedChecks = input.seoChecks.filter((c) => !c.pass);

  const prompt = `گزارش اجرای پایپ‌لاین:

مقاله‌ی نهایی: «${input.post.title}»
امتیاز نهایی ویراستار: ${input.editorReview.score}/100
جزئیات روبریک: ${JSON.stringify(input.editorReview.rubric)}
تعداد دور بازنویسی: ${input.revisionRounds}
ایرادهای آخرین بازبینی ویراستار:
${input.editorReview.issues.map((i) => `- ${i}`).join("\n") || "- (بدون ایراد)"}
چک‌های سئوی ردشده:
${failedChecks.map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (همه پاس شدند)"}

متن مقاله (برای قضاوت کیفی):
${input.post.contentMd.slice(0, 6000)}

این اجرا را تحلیل کن و حداکثر ۳ درس برای بهبود اجراهای بعدی استخراج کن. اگر سیستم عالی کار کرده، درس کمتر بده یا هیچ درس نده — درسِ بی‌ارزش خودش هزینه است.`;

  const result = await runAgentJSON({
    agent: "critic",
    system,
    prompt,
    temperature: 0.4,
    schema: CriticOutputSchema,
    shapeHint: `{
  "overallScore": 80,
  "strengths": ["نقطه قوت این اجرا"],
  "weaknesses": ["نقطه ضعف این اجرا"],
  "lessons": [ { "agent": "writer", "lesson": "درس قابل‌اجرا برای اجراهای بعدی" } ]
}`,
  });

  await saveLessons(result.lessons, "critic");
  return result;
}

/* ── منتقد پایپ‌لاین بازآفرینی ───────────────────────────── */

/**
 * همان منتقد، برای پایپ‌لاین‌های اجتماعی.
 *
 * چرا تابع جدا و نه پارامتر روی runCritic؟ چون ورودی‌ها اساساً فرق دارند
 * (چند خروجی به‌جای یکی، چک‌های اجتماعی به‌جای سئو) و یکی‌کردنشان یعنی یک
 * تابع پر از شرط. دو تابع کوتاهِ خوانا بهتر از یک تابع دوکاره است.
 *
 * `parts` آرایه است تا هم اجرای بازآفرینی (دو خروجی: اینستاگرام و لینکدین)
 * و هم پایپ‌لاین تک‌پلتفرمی (یک خروجی) را پوشش دهد.
 */
export type SocialCriticPart = {
  /** برچسب فارسی برای گزارش، مثل «کاروسل اینستاگرام» */
  label: string;
  draft: unknown;
  review: Review | SocialReview;
  checks: SocialCheck[];
};

export async function runSocialCritic(input: {
  /** توضیح یک‌خطی از منشأ این اجرا — مقاله‌ی مبدأ یا موضوع درخواستی */
  context: string;
  parts: SocialCriticPart[];
  revisionRounds: number;
}): Promise<CriticOutput> {
  const system = `تو «منتقد» سیستم تولید محتوای آرکان هستی. کارت بهبود خودِ سیستم است، نه این محتوای خاص. از هر اجرا الگو استخراج می‌کنی: چه چیزی خوب کار کرد، چه چیزی نه، و کدام ایجنت باید دفعه‌ی بعد چه‌کار متفاوتی بکند.

این اجرا از نوع «تولید محتوای شبکه‌های اجتماعی» بود.

ایجنت‌های سیستم: ${AGENT_IDS.join(", ")}

قاعده‌ی طلایی درس خوب: کوتاه، قابل‌اجرا و عمومی (برای همه‌ی محتواهای آینده، نه فقط این یکی). مثال خوب: «instagram-writer: در اسلاید اول به‌جای تیتر کلی، خودِ عدد یا ادعای تکان‌دهنده را بگذار». مثال بد: «کاروسل خوب بود».`;

  const section = (part: SocialCriticPart) => `— ${part.label} —
امتیاز ویراستار: ${part.review.score}/100
روبریک: ${JSON.stringify(part.review.rubric)}
ایرادهای باقی‌مانده:
${part.review.issues.map((i) => `- ${i}`).join("\n") || "- (بدون ایراد)"}
چک‌های قطعیِ ردشده:
${part.checks.filter((c) => !c.pass).map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (همه پاس شدند)"}
محتوای نهایی:
${JSON.stringify(part.draft, null, 2).slice(0, 3000)}`;

  const prompt = `گزارش اجرا:

${input.context}
مجموع دورهای بازنویسی: ${input.revisionRounds}

${input.parts.map(section).join("\n\n")}

این اجرا را تحلیل کن و حداکثر ۳ درس برای بهبود اجراهای بعدی استخراج کن. اگر سیستم عالی کار کرده، درس کمتر بده یا هیچ درس نده — درسِ بی‌ارزش خودش هزینه است.`;

  const result = await runAgentJSON({
    agent: "critic",
    system,
    prompt,
    temperature: 0.4,
    schema: CriticOutputSchema,
    shapeHint: `{
  "overallScore": 80,
  "strengths": ["نقطه قوت این اجرا"],
  "weaknesses": ["نقطه ضعف این اجرا"],
  "lessons": [ { "agent": "instagram-writer", "lesson": "درس قابل‌اجرا برای اجراهای بعدی" } ]
}`,
  });

  await saveLessons(result.lessons, "critic");
  return result;
}

/* ── تبدیل بازخورد انسانی به درس ─────────────────────────── */

const FeedbackLessonsSchema = z.object({
  lessons: z
    .array(z.object({ agent: z.enum(AGENT_IDS), lesson: z.string().min(10) }))
    .max(2),
});

/**
 * بازخورد انسانی → درس.
 *
 * ورودی عمداً «عنوان + متن + نوع محتوا» است، نه یک Post. با این کار همان
 * تابع هم برای مقاله کار می‌کند، هم برای کاروسل و ریلز — بدون شرط اضافه.
 */
export async function distillFeedback(input: {
  /** مثلاً «مقاله» یا «کاروسل اینستاگرام» */
  contentKind: string;
  title: string;
  content: string;
  rating: "up" | "down";
  comment: string;
}): Promise<number> {
  // بازخورد مثبتِ بدون توضیح، درسی ندارد
  if (input.rating === "up" && !input.comment.trim()) return 0;

  const system = `تو «منتقد» سیستم تولید محتوای آرکان هستی. بازخورد انسانی را به درس قابل‌اجرا برای ایجنت‌ها تبدیل می‌کنی.
ایجنت‌های سیستم: ${AGENT_IDS.join(", ")}
درس را به ایجنتی نسبت بده که واقعاً مسئول آن ایراد است؛ اگر بازخورد درباره‌ی محتوای اجتماعی است، سراغ ایجنت‌های بلاگ نرو.
اگر بازخورد آن‌قدر مبهم است که درس عمومی از آن درنمی‌آید، آرایه‌ی خالی بده.`;

  const prompt = `نوع محتوا: ${input.contentKind}
عنوان: «${input.title}»
بخشی از متن: ${input.content.slice(0, 2000)}

بازخورد انسان:
نظر کلی: ${input.rating === "up" ? "👍 مثبت" : "👎 منفی"}
توضیح: ${input.comment || "(بدون توضیح)"}

حداکثر ۲ درس عمومی و قابل‌اجرا استخراج کن.`;

  const result = await runAgentJSON({
    agent: "critic",
    system,
    prompt,
    schema: FeedbackLessonsSchema,
    shapeHint: `{ "lessons": [ { "agent": "writer", "lesson": "درس قابل‌اجرا" } ] }`,
  });

  await saveLessons(result.lessons, "human");
  return result.lessons.length;
}
