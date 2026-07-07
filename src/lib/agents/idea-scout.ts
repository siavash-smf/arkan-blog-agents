import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_PROFILE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { IdeaScoutOutputSchema, type Idea } from "./types";

/**
 * ایجنت ۱ — ایده‌یاب (Idea Scout)
 *
 * وظیفه: تولید چند ایده‌ی مقاله و امتیازدهی به آن‌ها.
 * ورودی مهم: عنوان پست‌های قبلی، تا ایده‌ی تکراری ندهد — ایجنت‌ها حافظه
 * ندارند؛ هر «دانستنی» را باید صریح در پرامپت به آن‌ها بدهیم.
 */

export async function runIdeaScout(input: {
  topicHint: string | null;
  existingTitles: string[];
}): Promise<Idea[]> {
  const lessons = await lessonsBlockFor("idea-scout");

  const system = `تو «ایده‌یاب» تیم محتوای شرکت آرکان هستی — متخصص پیداکردن موضوع‌هایی که هم برای مخاطب جذاب‌اند و هم در جستجوی فارسی تقاضا دارند.

${COMPANY_PROFILE}${lessons}`;

  const existing =
    input.existingTitles.length > 0
      ? `\n\nمقاله‌های موجود بلاگ (ایده‌ی تکراری یا خیلی مشابه این‌ها نده):\n${input.existingTitles.map((t) => `- ${t}`).join("\n")}`
      : "";

  const hint = input.topicHint
    ? `\n\nمدیر محتوا این حوزه را پیشنهاد داده؛ ایده‌ها حول همین باشند: «${input.topicHint}»`
    : "";

  const prompt = `۵ ایده‌ی مقاله برای بلاگ آرکان پیشنهاد بده.

معیارهای امتیازدهی (۰ تا ۱۰):
- آیا مدیر یک کسب‌وکار ایرانی واقعاً این را در گوگل جستجو می‌کند؟
- آیا به خدمات آرکان (استراتژی، ساختار، بازار، اجرا) وصل می‌شود؟
- آیا می‌توان حرف عملی و غیرتکراری در آن زد؟${existing}${hint}`;

  const result = await runAgentJSON({
    agent: "idea-scout",
    system,
    prompt,
    temperature: 0.8,
    schema: IdeaScoutOutputSchema,
    shapeHint: `{
  "ideas": [
    {
      "title": "عنوان پیشنهادی مقاله به فارسی",
      "angle": "زاویه‌ی خاص و متمایز مقاله در یک جمله",
      "searchIntent": "کاربر با چه نیتی این را جستجو می‌کند",
      "score": 8.5,
      "reason": "چرا این ایده خوب است"
    }
  ]
}`,
  });

  // مرتب‌سازی نزولی بر اساس امتیاز؛ استراتژیست از بهترین شروع می‌کند
  return result.ideas.sort((a, b) => b.score - a.score);
}
