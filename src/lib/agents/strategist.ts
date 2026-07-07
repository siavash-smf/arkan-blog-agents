import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { BRAND_VOICE, COMPANY_PROFILE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { BriefSchema, type Brief, type Idea } from "./types";

/**
 * ایجنت ۲ — استراتژیست محتوا (Content Strategist)
 *
 * وظیفه: تبدیل بهترین ایده به «بریف محتوا» — سندی که نویسنده و سئوکار
 * بر اساس آن کار می‌کنند: مخاطب دقیق، کلمه‌ی کلیدی اصلی، ساختار مقاله و CTA.
 *
 * نکته‌ی آموزشی: جداکردن «تصمیم‌گیری درباره‌ی چیستی» (استراتژیست) از
 * «تولید» (نویسنده) کیفیت را بالا می‌برد؛ همان دلیلی که در تیم انسانی هم
 * بریف قبل از نوشتن تهیه می‌شود.
 */

export async function runStrategist(input: {
  ideas: Idea[];
  topicHint: string | null;
}): Promise<Brief> {
  const lessons = await lessonsBlockFor("strategist");

  const system = `تو «استراتژیست محتوا»ی شرکت آرکان هستی. از بین ایده‌ها بهترین را انتخاب و به بریف اجرایی تبدیل می‌کنی.

${COMPANY_PROFILE}

${BRAND_VOICE}${lessons}`;

  const ideasText = input.ideas
    .map(
      (i, n) =>
        `${n + 1}. «${i.title}» (امتیاز ${i.score}/10)\n   زاویه: ${i.angle}\n   نیت جستجو: ${i.searchIntent}`
    )
    .join("\n");

  const prompt = `ایده‌های پیشنهادی ایده‌یاب (مرتب بر اساس امتیاز):

${ideasText}

بهترین ایده را انتخاب کن (لازم نیست حتماً اولی باشد — قضاوت خودت را داشته باش) و بریف کامل محتوا بساز:
- عنوان نهایی را در صورت نیاز بهتر کن (جذاب اما بدون کلیک‌بیت).
- کلمه‌ی کلیدی اصلی باید عبارتی باشد که واقعاً به فارسی جستجو می‌شود.
- ساختار (outline) باید ۴ تا ۷ بخش داشته باشد و آخرین بخش به CTA مشاوره‌ی رایگان آرکان برسد.
- طول هدف بین ۹۰۰ تا ۱۵۰۰ کلمه باشد.`;

  return runAgentJSON({
    agent: "strategist",
    system,
    prompt,
    schema: BriefSchema,
    shapeHint: `{
  "title": "عنوان نهایی مقاله",
  "audience": "توصیف دقیق مخاطب این مقاله",
  "searchIntent": "نیت جستجوی کاربر",
  "primaryKeyword": "کلمه کلیدی اصلی فارسی",
  "secondaryKeywords": ["کلمه ۱", "کلمه ۲", "کلمه ۳"],
  "outline": [
    { "heading": "عنوان بخش", "points": ["نکته‌ای که باید پوشش داده شود"] }
  ],
  "targetWordCount": 1200,
  "cta": "متن دعوت به اقدام پایانی در یکی دو جمله"
}`,
  });
}
