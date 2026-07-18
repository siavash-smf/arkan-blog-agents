import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_PROFILE, BRAND_VOICE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import {
  LinkedInPostSchema,
  type LinkedInPost,
  type SocialBrief,
  type SocialReview,
} from "./types";
import type { SocialCheck } from "./social-checks";

/**
 * ایجنت ۳ (پایپ‌لاین بازآفرینی) — کپی‌رایتر لینکدین
 *
 * وظیفه: همان بریف اجتماعی را به یک پست لینکدین تبدیل کند.
 *
 * نکته‌ی آموزشی: این ایجنت و کپی‌رایتر اینستاگرام **ورودی یکسان** دارند و
 * خروجی کاملاً متفاوت. همین، درسِ اصلی این فاز است: تفاوت در «قواعد
 * پلتفرم» است، نه در محتوا. یک پیام، چند لباس.
 */

function systemPrompt(lessons: string): string {
  return `تو «کپی‌رایتر لینکدین» آرکان هستی. برای فیدی می‌نویسی که مخاطبش مدیران و بنیان‌گذارانند و حوصله‌ی تبلیغ ندارند.

${COMPANY_PROFILE}

${BRAND_VOICE}

قواعد لینکدین (رعایتشان اجباری است):
- **سه خط اول** (حدود ۲۱۰ کاراکتر) قبل از «... بیشتر ببینید» دیده می‌شود و تنها شانس توقف اسکرول است. با یک ادعای مشخص یا یک مشاهده‌ی واقعی شروع کن. «در این پست می‌خواهم درباره‌ی...» بدترین شروع ممکن است.
- **هیچ لینکی در متن پست نگذار.** لینکدین پست‌های دارای لینک بیرونی را کمتر نشان می‌دهد؛ لینک در کامنت اول می‌آید. حتی اگر به‌نظرت کمک‌کننده است، ننویس.
- هر پاراگراف یک ایده. بین پاراگراف‌ها خط خالی بگذار. حداقل چهار پاراگراف — دیوارِ متن در فید خوانده نمی‌شود.
- تیتر مارک‌داون (## یا **) استفاده نکن؛ لینکدین هیچ‌کدام را رندر نمی‌کند و کاراکترها خام دیده می‌شوند.
- طول کل: بین ۹۰۰ تا ۱۸۰۰ کاراکتر. بلندتر از این، مقاله‌ای است که در فید کپی شده.
- پست باید با یک **پرسشِ دعوت به گفت‌وگو** تمام شود، نه با «برای مشاوره تماس بگیرید». پرسش باید واقعی باشد و تجربه‌ی مخاطب را بخواهد.
- ۳ تا ۵ هشتگ، در انتها، روی خط خودشان.
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
  "body": "متن کامل پست، با خط خالی بین پاراگراف‌ها",
  "hashtags": ["#استراتژی", "#رشد_کسب_وکار", "#مدیریت"],
  "cta": "پرسش پایانی دعوت به گفت‌وگو"
}`;

export async function runLinkedinWriter(input: {
  brief: SocialBrief;
}): Promise<LinkedInPost> {
  const lessons = await lessonsBlockFor("linkedin-writer");

  return runAgentJSON({
    agent: "linkedin-writer",
    system: systemPrompt(lessons),
    prompt: `${briefBlock(input.brief)}

یک پست لینکدین کامل بنویس. هشتگ‌ها را در فیلد hashtags بده، نه داخل body.`,
    temperature: 0.7,
    schema: LinkedInPostSchema,
    shapeHint: SHAPE_HINT,
  });
}

export async function runLinkedinRevision(input: {
  brief: SocialBrief;
  draft: LinkedInPost;
  review: SocialReview;
  failedChecks: SocialCheck[];
}): Promise<LinkedInPost> {
  const lessons = await lessonsBlockFor("linkedin-writer");

  const prompt = `${briefBlock(input.brief)}

— پیش‌نویس فعلی —
${JSON.stringify(input.draft, null, 2)}

— ایرادهای ویراستار (امتیاز ${input.review.score}/100) —
${input.review.issues.map((i) => `- ${i}`).join("\n") || "- (بدون ایراد)"}

— چک‌های قطعیِ ردشده —
${input.failedChecks.map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (همه پاس شدند)"}

پست را اصلاح کن. فقط چیزهایی را عوض کن که ایراد دارند؛ بقیه را دست نزن.`;

  return runAgentJSON({
    agent: "linkedin-writer",
    system: systemPrompt(lessons),
    prompt,
    temperature: 0.5,
    schema: LinkedInPostSchema,
    shapeHint: SHAPE_HINT,
  });
}
