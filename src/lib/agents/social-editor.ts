import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { BRAND_VOICE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { SocialReviewSchema, type SocialBrief, type SocialReview } from "./types";
import type { SocialCheck } from "./social-checks";
import type { SocialPlatform } from "@/lib/store";

/**
 * ایجنت ۴ (پایپ‌لاین بازآفرینی) — ویراستار اجتماعی
 *
 * همان الگوی Generator/Critic که در ویراستار بلاگ توضیح داده شده: مدلی که
 * خودش نوشته، در نقد نوشته‌اش سخت‌گیر نیست. پس یک ایجنت جدا با روبریک
 * عددی، دروازه‌ی کیفیت است.
 *
 * تفاوت با ویراستار بلاگ: روبریک عوض شده (قلاب و تناسب با پلتفرم به‌جای
 * ساختار و سودمندی)، و چک‌های قطعیِ ردشده هم به آن داده می‌شود تا قضاوتش
 * را صرف چیزی که کد از قبل اندازه گرفته نکند — همان تقسیم کاری که بین
 * seo.ts و seo-checks.ts هست.
 */

/**
 * حد نصاب پذیرش — پایین‌تر از ۷۵ بلاگ، چون متن کوتاه سطح کمتری برای
 * امتیازدهی دارد و فقط یک دور بازنویسی می‌گیرد.
 */
export const SOCIAL_APPROVE_THRESHOLD = 70;

/**
 * «کانال» از «پلتفرم» جداست: ریلز هم روی اینستاگرام منتشر می‌شود، ولی
 * قاعده‌های ارزیابی‌اش کاملاً فرق دارد (متن گفتاری در برابر متن خواندنی).
 */
export type SocialChannel = SocialPlatform | "reels";

const CHANNEL_RUBRIC: Record<SocialChannel, string> = {
  instagram: `- hook: آیا جمله‌ی اول کپشن به‌تنهایی اسکرول را متوقف می‌کند؟
- platformFit: آیا واقعاً کاروسل اینستاگرام است؟ هر اسلاید یک ایده، اسلاید اول قلاب، اسلاید آخر دعوت به اقدام، متن‌ها به‌اندازه‌ی کوتاه برای خوانده‌شدن روی تصویر.`,
  linkedin: `- hook: آیا سه خط اول قبل از «بیشتر ببینید» یک ادعای مشخص دارد؟
- platformFit: آیا واقعاً پست لینکدین است؟ پاراگراف‌های کوتاه، بدون تیتر مارک‌داون، پایان با پرسشِ دعوت به گفت‌وگو، لحن حرفه‌ای نه تبلیغاتی.`,
  reels: `- hook: آیا جمله‌ی اول در سه تا پنج ثانیه میخکوب می‌کند، بدون مقدمه‌چینی؟
- platformFit: آیا این متن **گفتنی** است؟ آن را در ذهنت بلند بخوان: جمله‌ها باید کوتاه و قابل نفس‌گیری باشند، بدون عبارت‌های کتابی و اداری. همچنین قوس روایت را بسنج: مسئله ← توضیح ساده ← «خب که چه؟». دعوت به اقدام باید طبیعی به محتوا چسبیده باشد، نه الصاق‌شده.`,
};

const CHANNEL_LABEL: Record<SocialChannel, string> = {
  instagram: "کاروسل اینستاگرام",
  linkedin: "پست لینکدین",
  reels: "اسکریپت ریلز",
};

export async function runSocialEditor(input: {
  channel: SocialChannel;
  brief: SocialBrief;
  draft: unknown;
  failedChecks: SocialCheck[];
}): Promise<SocialReview> {
  const lessons = await lessonsBlockFor("social-editor");
  const label = CHANNEL_LABEL[input.channel];

  const system = `تو «ویراستار شبکه‌های اجتماعی» آرکان هستی — سخت‌گیر اما منصف. کارت قضاوت کیفیت است، نه بازنویسی. ایرادهایی که می‌گیری باید آن‌قدر مشخص باشند که کپی‌رایتر دقیقاً بداند چه چیزی را کجا عوض کند.

${BRAND_VOICE}${lessons}`;

  const prompt = `بریف اجتماعی:
پیام مرکزی: ${input.brief.coreMessage}
مخاطب: ${input.brief.audience}
زاویه‌ی قلاب: ${input.brief.hookAngle}

— ${label} برای بازبینی —
${JSON.stringify(input.draft, null, 2)}

— چک‌های قطعیِ ردشده (کد اندازه گرفته، دوباره قضاوتشان نکن) —
${input.failedChecks.map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (همه پاس شدند)"}

این محتوا را با روبریک زیر ارزیابی کن (هر معیار ۰ تا ۱۰):
${CHANNEL_RUBRIC[input.channel]}
- brandVoice: تطابق با لحن برند — بدون اغراق، بدون تبلیغ‌زدگی؟
- clarity: آیا پیام مرکزی روشن منتقل شده یا در کلی‌گویی گم شده؟
- persian: فارسی طبیعی — بدون ترجمه‌زدگی و جمله‌های ماشینی؟

score = مجموع پنج معیار × ۲ (یعنی ۰ تا ۱۰۰).
اگر score زیر ${SOCIAL_APPROVE_THRESHOLD} بود verdict را "revise" بگذار و در issues دقیق بگو چه چیزی باید اصلاح شود؛ وگرنه "approve".`;

  return runAgentJSON({
    agent: "social-editor",
    system,
    prompt,
    temperature: 0.3,
    schema: SocialReviewSchema,
    shapeHint: `{
  "score": 78,
  "rubric": { "hook": 8, "platformFit": 8, "brandVoice": 8, "clarity": 7, "persian": 8 },
  "issues": ["ایراد مشخص و قابل اجرا"],
  "verdict": "approve"
}`,
  });
}
