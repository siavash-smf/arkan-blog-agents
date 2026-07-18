import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_PROFILE, BRAND_VOICE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import {
  InstagramCarouselSchema,
  type InstagramCarousel,
  type SocialBrief,
  type SocialReview,
} from "./types";
import type { SocialCheck } from "./social-checks";

/**
 * ایجنت ۲ (پایپ‌لاین بازآفرینی) — کپی‌رایتر اینستاگرام
 *
 * وظیفه: بریف اجتماعی را به یک کاروسل ۵ تا ۸ اسلایدی + کپشن تبدیل کند.
 *
 * نکته‌ی آموزشی: برخلاف نویسنده‌ی بلاگ که متن آزاد مارک‌داون می‌دهد، این
 * ایجنت خروجی **ساختاریافته** می‌دهد (آرایه‌ای از اسلایدها). چون هر اسلاید
 * بعداً جداگانه در یک قاب ۱:۱ رندر می‌شود، شکل داده باید تضمین‌شده باشد —
 * نه یک رشته که بعداً بخواهیم پارسش کنیم.
 */

/** قواعد مشترک بین پیش‌نویس اول و بازنویسی */
function systemPrompt(lessons: string): string {
  return `تو «کپی‌رایتر اینستاگرام» آرکان هستی. کاروسل‌های آموزشی می‌نویسی که مدیران کسب‌وکار اسکرول را برایشان متوقف کنند.

${COMPANY_PROFILE}

${BRAND_VOICE}

قواعد اینستاگرام (رعایتشان اجباری است):
- **جمله‌ی اول کپشن** قلاب است و باید کوتاه‌تر از ۱۲۵ کاراکتر باشد؛ اینستاگرام حدوداً همان‌جا «... بیشتر» می‌زند. این جمله باید به‌تنهایی معنی بدهد و کنجکاوی بسازد، و با نقطه یا علامت سؤال تمام شود. با سلام، با نام برند، یا با «در این پست...» شروع نکن.
- کاروسل ۵ تا ۸ اسلاید دارد:
  · اسلاید ۱ = قلاب. تصویریِ همان ایده، نه کپیِ لفظ‌به‌لفظِ کپشن.
  · اسلایدهای میانی = هر کدام دقیقاً یک ایده.
  · اسلاید آخر = دعوت به اقدام.
- heading هر اسلاید باید در اندازه‌ی بندانگشتی خوانا باشد: کوتاه، بدون جمله‌ی وابسته. text حداکثر دو جمله‌ی کوتاه.
- **هیچ لینکی در کپشن نگذار.** اینستاگرام لینک کپشن را کلیک‌پذیر نمی‌کند؛ به‌جایش بنویس «لینک در بایو».
- ۸ تا ۱۵ هشتگ، هرکدام با # و بدون فاصله، بدون تکرار. ترکیبی از فارسی و انگلیسی. هشتگ اسپم ممنوع (#فالو، #لایک، #فالوبک).
- ایموجی کم و کاربردی. لحن برند اجازه‌ی لحن تبلیغاتی داغ نمی‌دهد.
- اعداد داخل متن را فارسی بنویس.${lessons}`;
}

function briefBlock(brief: SocialBrief): string {
  return `بریف اجتماعی:
پیام مرکزی: ${brief.coreMessage}
مخاطب: ${brief.audience}
زاویه‌ی قلاب: ${brief.hookAngle}
نکته‌های کلیدی:
${brief.keyPoints.map((p) => `- ${p}`).join("\n")}
شاهد/مثال: ${brief.proofPoint}
دعوت به اقدام: ${brief.cta}`;
}

const SHAPE_HINT = `{
  "title": "عنوان داخلی برای فهرست استودیو",
  "caption": "کپشن — ۱۲۵ کاراکتر اولش قلاب است",
  "slides": [
    { "kicker": "قلاب", "heading": "تیتر کوتاه اسلاید", "text": "یکی دو جمله" }
  ],
  "hashtags": ["#استراتژی_کسب_وکار", "#مدیریت"],
  "cta": "دعوت به اقدام اسلاید آخر"
}`;

export async function runInstagramWriter(input: {
  brief: SocialBrief;
}): Promise<InstagramCarousel> {
  const lessons = await lessonsBlockFor("instagram-writer");

  return runAgentJSON({
    agent: "instagram-writer",
    system: systemPrompt(lessons),
    prompt: `${briefBlock(input.brief)}

یک کاروسل اینستاگرام کامل بنویس.`,
    temperature: 0.8,
    schema: InstagramCarouselSchema,
    shapeHint: SHAPE_HINT,
  });
}

/**
 * بازنویسی بر اساس ایرادهای ویراستار + چک‌های قطعیِ ردشده.
 *
 * نکته: پیش‌نویس قبلی را کامل به مدل می‌دهیم تا «اصلاح» کند، نه اینکه از
 * صفر بنویسد؛ وگرنه چیزهایی که درست بودند هم عوض می‌شوند.
 */
export async function runInstagramRevision(input: {
  brief: SocialBrief;
  draft: InstagramCarousel;
  review: SocialReview;
  failedChecks: SocialCheck[];
}): Promise<InstagramCarousel> {
  const lessons = await lessonsBlockFor("instagram-writer");

  const prompt = `${briefBlock(input.brief)}

— پیش‌نویس فعلی —
${JSON.stringify(input.draft, null, 2)}

— ایرادهای ویراستار (امتیاز ${input.review.score}/100) —
${input.review.issues.map((i) => `- ${i}`).join("\n") || "- (بدون ایراد)"}

— چک‌های قطعیِ ردشده —
${input.failedChecks.map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (همه پاس شدند)"}

کاروسل را اصلاح کن. فقط چیزهایی را عوض کن که ایراد دارند؛ بقیه را دست نزن.`;

  return runAgentJSON({
    agent: "instagram-writer",
    system: systemPrompt(lessons),
    prompt,
    temperature: 0.6,
    schema: InstagramCarouselSchema,
    shapeHint: SHAPE_HINT,
  });
}
