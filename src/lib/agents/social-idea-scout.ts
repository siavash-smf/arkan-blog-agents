import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_PROFILE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { SocialIdeaScoutOutputSchema, type SocialIdea } from "./types";

/**
 * ایجنت ۱ (پایپ‌لاین اینستاگرام) — ایده‌یاب اجتماعی
 *
 * خواهرِ ایده‌یاب بلاگ، نه نسخه‌ی پارامتری‌شده‌اش. دلیلش در کامنت
 * SocialIdeaSchema توضیح داده شده: ایده‌ی خوبِ سئو و ایده‌ی خوبِ فید دو
 * چیز متفاوت‌اند. ایده‌ی سئو به تقاضای جستجو جواب می‌دهد؛ ایده‌ی فید باید
 * انگشتِ در حال اسکرول را متوقف کند — کسی دنبالش نمی‌گردد.
 *
 * ورودی مهم: عنوان محتواهای قبلی، تا تکراری نسازد. ایجنت‌ها حافظه ندارند؛
 * هر «دانستنی» را باید صریح در پرامپت بدهیم.
 */
export async function runSocialIdeaScout(input: {
  topicHint: string | null;
  existingTitles: string[];
}): Promise<SocialIdea[]> {
  const lessons = await lessonsBlockFor("social-idea-scout");

  const system = `تو «ایده‌یاب شبکه‌های اجتماعی» تیم محتوای آرکان هستی — متخصص پیداکردن حرف‌هایی که مدیر یک کسب‌وکار، وسط اسکرول کردن، برایشان می‌ایستد.

${COMPANY_PROFILE}

تفاوت کلیدی با محتوای بلاگ: در فید، **کسی دنبال شما نمی‌گردد**. مقاله جواب یک جستجوست، ولی کاروسل باید خودش توجه را بدزدد. پس ایده‌ای بده که یک باور رایج را به چالش بکشد، یک اشتباه پرتکرار را نام ببرد، یا عددی/تجربه‌ای بگوید که مخاطب انتظارش را ندارد. عنوان‌های خنثی و آموزشیِ عمومی («راهنمای جامع استراتژی») در فید مرده‌اند.${lessons}`;

  const existing =
    input.existingTitles.length > 0
      ? `\n\nمحتواهای اجتماعی قبلی (ایده‌ی تکراری یا خیلی مشابه این‌ها نده):\n${input.existingTitles.map((t) => `- ${t}`).join("\n")}`
      : "";

  const hint = input.topicHint
    ? `\n\nمدیر محتوا این حوزه را پیشنهاد داده؛ ایده‌ها حول همین باشند: «${input.topicHint}»`
    : "";

  const prompt = `۵ ایده‌ی کاروسل اینستاگرام برای آرکان پیشنهاد بده.

معیارهای امتیازدهی (۰ تا ۱۰):
- آیا قلابش واقعاً اسکرول را متوقف می‌کند، یا فقط یک عنوان مؤدبانه است؟
- آیا به دردِ واقعی و مشخصی از مدیر کسب‌وکار ایرانی می‌خورد؟
- آیا به خدمات آرکان (استراتژی، ساختار، بازار، اجرا) وصل می‌شود؟
- آیا حرف تازه‌ای دارد، یا تکرار چیزی است که همه گفته‌اند؟${existing}${hint}`;

  const result = await runAgentJSON({
    agent: "social-idea-scout",
    system,
    prompt,
    temperature: 0.9,
    schema: SocialIdeaScoutOutputSchema,
    shapeHint: `{
  "ideas": [
    {
      "title": "عنوان داخلی ایده",
      "hook": "جمله‌ای که اسکرول را متوقف می‌کند",
      "painPoint": "دردی از مخاطب که این ایده به آن می‌پردازد",
      "score": 8.5,
      "reason": "چرا این ایده در فید کار می‌کند"
    }
  ]
}`,
  });

  // مرتب‌سازی نزولی؛ استراتژیست از بهترین شروع می‌کند
  return result.ideas.sort((a, b) => b.score - a.score);
}
