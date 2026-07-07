import "server-only";
import { getStore } from "@/lib/store";

/**
 * تزریق «درس‌ها» به پرامپت ایجنت‌ها — قلب مکانیزم خودبهبودی.
 *
 * جریان کامل:
 * ۱. منتقد بعد از هر اجرا (و از بازخورد انسانی) درس استخراج می‌کند → جدول lessons
 * ۲. قبل از اجرای هر ایجنت، آخرین درس‌های فعالِ همان ایجنت خوانده می‌شود
 * ۳. این بلوک به system prompt او اضافه می‌شود
 *
 * نتیجه: سیستم بدون تغییر کد، از تجربه‌ی اجراهای قبلی بهتر می‌شود.
 */

const MAX_LESSONS_IN_PROMPT = 5;

export async function lessonsBlockFor(agent: string): Promise<string> {
  const lessons = await getStore().listLessons({ agent, activeOnly: true });
  if (lessons.length === 0) return "";

  const items = lessons
    .slice(0, MAX_LESSONS_IN_PROMPT)
    .map((l) => `- ${l.lesson}`)
    .join("\n");

  return `\n\n— درس‌های آموخته‌شده از اجراهای قبلی (حتماً رعایت کن) —\n${items}`;
}
