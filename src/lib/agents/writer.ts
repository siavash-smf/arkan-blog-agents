import "server-only";
import { runAgentText, writerModel } from "@/lib/ai";
import { BRAND_VOICE, COMPANY_PROFILE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import type { Brief, Research, Review } from "./types";

/**
 * ایجنت ۴ — نویسنده (Writer)
 *
 * تنها ایجنتی که خروجی متنی آزاد (مارک‌داون) دارد، نه JSON — چون خروجی‌اش
 * برای انسان است، نه برای ایجنت بعدی. دو حالت دارد:
 * - write:  نگارش پیش‌نویس اول از روی بریف + پژوهش
 * - revise: بازنویسی بر اساس ایرادهای ویراستار (حلقه‌ی بازبینی)
 */

async function writerSystem(): Promise<string> {
  const lessons = await lessonsBlockFor("writer");
  return `تو «نویسنده»ی بلاگ شرکت آرکان هستی — نویسنده‌ای حرفه‌ای که فارسی روان و طبیعی می‌نویسد و از ترجمه‌زدگی بیزار است.

${COMPANY_PROFILE}

${BRAND_VOICE}

قواعد نگارش:
- خروجی فقط مارک‌داون خالص مقاله است؛ بدون هیچ توضیح اضافه قبل یا بعد.
- مقاله با یک تیتر H1 (#) شروع می‌شود؛ بخش‌ها H2 (##) هستند.
- پاراگراف‌ها کوتاه (۲ تا ۴ جمله). از فهرست و بولت جای مناسب استفاده کن.
- فقط از فکت‌های پژوهش استفاده کن؛ آمار و عدد از خودت نساز.
- اعداد داخل متن فارسی باشند (۱۲۳).${lessons}`;
}

function briefBlock(brief: Brief, research: Research): string {
  return `— بریف —
عنوان: ${brief.title}
مخاطب: ${brief.audience}
کلمه‌ی کلیدی اصلی: ${brief.primaryKeyword} (در تیتر و پاراگراف اول به‌طور طبیعی بیاید)
کلمات کلیدی فرعی: ${brief.secondaryKeywords.join("، ")}
طول هدف: حدود ${brief.targetWordCount} کلمه
ساختار:
${brief.outline.map((s) => `## ${s.heading}\n${s.points.map((p) => `   - ${p}`).join("\n")}`).join("\n")}
CTA پایانی: ${brief.cta}

— پژوهش —
فکت‌های کلیدی:
${research.keyFacts.map((f) => `- ${f}`).join("\n")}
مثال‌ها:
${research.examples.map((e) => `- ${e}`).join("\n")}
یادداشت پژوهشگر: ${research.angleNotes}`;
}

export async function runWriter(input: {
  brief: Brief;
  research: Research;
}): Promise<string> {
  return runAgentText({
    agent: "writer",
    model: writerModel(),
    system: await writerSystem(),
    prompt: `${briefBlock(input.brief, input.research)}

حالا مقاله‌ی کامل را بنویس.`,
    temperature: 0.7,
    maxOutputTokens: 12000,
  });
}

export async function runWriterRevision(input: {
  brief: Brief;
  research: Research;
  draft: string;
  review: Review;
}): Promise<string> {
  return runAgentText({
    agent: "writer",
    model: writerModel(),
    system: await writerSystem(),
    prompt: `${briefBlock(input.brief, input.research)}

— پیش‌نویس فعلی —
${input.draft}

— ایرادهای ویراستار (امتیاز فعلی: ${input.review.score}/100) —
${input.review.issues.map((i) => `- ${i}`).join("\n")}

پیش‌نویس را با رفع دقیق همین ایرادها بازنویسی کن. بخش‌های خوب را نگه دار؛ فقط جاهای مشکل‌دار را بهتر کن. خروجی، متن کامل و نهایی مقاله است.`,
    temperature: 0.5,
    maxOutputTokens: 12000,
  });
}
