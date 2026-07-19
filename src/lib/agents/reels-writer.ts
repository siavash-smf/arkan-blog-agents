import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_PROFILE, BRAND_VOICE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { ctaListBlock } from "./reels-cta";
import { ReelsScriptSchema, type ReelsScript, type SocialReview } from "./types";
import type { SocialCheck } from "./social-checks";
import type { ReelsSource } from "./reels-source";

/**
 * ایجنت — کپی‌رایتر ریلز
 *
 * از یک لینک یا متن، اسکریپتی می‌سازد که مستقیم از رویش خوانده و ضبط شود.
 *
 * نکته‌ی کلیدی این ایجنت: خروجی باید **گفتنی** باشد، نه نوشتنی. جمله‌ی
 * قشنگِ کتابی وقتی بلند خوانده می‌شود مصنوعی به گوش می‌آید. برای همین
 * ساختار جمله‌ها کوتاه و نفس‌گیر است.
 *
 * تطبیق با برند آرکان: نسخه‌ی اصلی این دستورالعمل لحن محاوره‌ای و خطاب
 * «تو» می‌خواست، ولی برندگاید آرکان صریحاً «همیشه با خطاب شما» را الزام
 * می‌کند و خودِ دستورالعمل هم گفته در تناقض، برندگاید اولویت دارد. نتیجه:
 * لحن «گفتاری اما محترمانه» — روان و بدون تکلف، ولی با «شما».
 */

function systemPrompt(lessons: string, hasLeadMagnet: boolean, leadMagnet: string | null): string {
  return `تو «کپی‌رایتر ریلز» آرکان هستی. اسکریپت‌هایی می‌نویسی که قرار است مستقیم از رویشان بلند خوانده و ضبط شوند.

${COMPANY_PROFILE}

${BRAND_VOICE}

— قاعده‌ی اول: هرچه می‌نویسی باید «گفتنی» باشد، نه «نوشتنی» —
اسکریپت را بلند بخوان؛ اگر جمله‌ای در دهان نمی‌چرخد، بازش کن. جمله‌های کوتاه و قابل نفس‌گیری. عبارت‌های کتابی و اداری («لذا»، «می‌بایست»، «حائز اهمیت») در گفتار مصنوعی‌اند؛ استفاده نکن.

**«گفتاری» یعنی ریتم و سادگیِ گفتار، نه املای محاوره‌ای.** این دو را قاطی نکن:
- خطاب همیشه «شما» است، نه «تو». (برندگاید آرکان)
- کلمه‌ها را کامل و کتابی بنویس: «اگر» نه «اگه»، «کسب‌وکارتان» نه «کسب‌وکارتون»، «می‌شود» نه «میشه»، «این‌طور» نه «این‌جوری»، «یک» نه «یه»، «دیگر» نه «دیگه».
- جمله باید طوری باشد که وقتی بلند خوانده می‌شود طبیعی به گوش برسد، ولی وقتی نوشته می‌بینی‌اش، فارسیِ درست باشد.

— ساختار —
۱) قلاب (۳ تا ۵ ثانیه): یک جمله که نگذارد مخاطب اسکرول کند. سؤال تیز، ادعای جسورانه، یا نام‌بردن یک اشتباه رایج. **مقدمه‌چینی و سلام و احوال‌پرسی ممنوع** — از همان کلمه‌ی اول برو سر اصل ماجرا. حداکثر حدود ۲۰ کلمه.
۲) بدنه: یک قوس روایت داشته باشد — مسئله یا سؤال ← توضیح ساده ← «خب که چه؟» یعنی نتیجه‌ای که به کار مخاطب می‌آید. اصطلاح تخصصی را یا حذف کن یا با یک مثال روزمره توضیح بده.
۳) دعوت به اقدام: از فهرست پایین **دقیقاً یکی** را انتخاب کن.

— طول —
هر ۱۴۰ کلمه‌ی فارسی حدود یک دقیقه خوانده می‌شود. سقف مطلق ۴۰۰ کلمه (زیر ۳ دقیقه). نقطه‌ی شیرین ۱۴۰ تا ۲۲۰ کلمه (یک تا یک‌ونیم دقیقه) — مگر محتوا واقعاً سنگین باشد.

— فهرست دعوت به اقدام (فقط یکی) —
${ctaListBlock(hasLeadMagnet)}

آن را انتخاب کن که با هدف اصلی همین ویدیو جور دربیاید. جمله را طبیعی بگو؛ لازم نیست کلمه‌به‌کلمه مثل نمونه باشد. در ctaId شناسه‌ی همان مورد را بگذار.${
    leadMagnet ? `\n\nمنبع رایگان موجود برای این ویدیو: «${leadMagnet}»` : ""
  }

— ممنوع —
- هیچ راهنمای صحنه، توضیح اجرا یا نشانه‌گذاری داخل کروشه در متن اسکریپت نگذار. فقط چیزی بنویس که قرار است **گفته** شود.
- عدد و آمار از خودت نساز. اگر در منبع نبود، به‌جای عدد دقیق، روند یا اصل را بگو.
- هشتگ‌ها را فقط در فیلد hashtags بگذار، نه داخل متن کپشن.
- وعده‌ی تضمینی و لحن تبلیغاتی داغ ممنوع است.${lessons}`;
}

const SHAPE_HINT = `{
  "title": "عنوان داخلی برای فهرست استودیو",
  "hook": "جمله‌ی کوبنده‌ی سه تا پنج ثانیه‌ی اول",
  "body": "بدنه‌ی اسکریپت، آماده‌ی بلندخوانی",
  "cta": "جمله‌ی دعوت به اقدام، همان‌طور که گفته می‌شود",
  "ctaId": "consultation",
  "ctaReason": "یک جمله: چرا این CTA برای این ویدیو درست است",
  "onScreenText": "متن کوتاه روی فریم قلاب",
  "caption": "کپشن پیشنهادی زیر ویدیو",
  "hashtags": ["#استراتژی", "#کسب_وکار", "#مدیریت"]
}`;

function sourceBlock(source: ReelsSource): string {
  if (source.trusted) {
    return `— ماده‌ی خام (${source.origin}) —
${source.text}`;
  }
  return `— زاویه‌ی پیشنهادی (این متن را **خود سیستم** تولید کرده، نه یک انسان) —
${source.text}

⚠️ این متن «واقعیت» نیست، فقط یک جهت است. هر عدد، درصد، آمار یا مثال موردیِ مشخصی که در آن آمده **ساختگی است** و نباید در اسکریپت تو ظاهر شود. فقط موضوع و زاویه را بردار؛ ادعاهای عددی را به بیان کیفی تبدیل کن.`;
}

export async function runReelsWriter(input: {
  source: ReelsSource;
  leadMagnet: string | null;
}): Promise<ReelsScript> {
  const lessons = await lessonsBlockFor("reels-writer");

  const prompt = `${sourceBlock(input.source)}

این محتوا را کامل بخوان، نکته‌ی اصلی و ارزشمندش را پیدا کن — آن چیزی که واقعاً ارزش یک ویدیو را دارد — و بر اساسش یک اسکریپت ریلز بنویس.`;

  return runAgentJSON({
    agent: "reels-writer",
    system: systemPrompt(lessons, Boolean(input.leadMagnet), input.leadMagnet),
    prompt,
    temperature: 0.7,
    maxOutputTokens: 4000,
    schema: ReelsScriptSchema,
    shapeHint: SHAPE_HINT,
  });
}

export async function runReelsRevision(input: {
  source: ReelsSource;
  leadMagnet: string | null;
  draft: ReelsScript;
  review: SocialReview;
  failedChecks: SocialCheck[];
}): Promise<ReelsScript> {
  const lessons = await lessonsBlockFor("reels-writer");

  const prompt = `${sourceBlock(input.source)}

— پیش‌نویس فعلی —
${JSON.stringify(input.draft, null, 2)}

— ایرادهای ویراستار (امتیاز ${input.review.score}/100) —
${input.review.issues.map((i) => `- ${i}`).join("\n") || "- (بدون ایراد)"}

— چک‌های قطعیِ ردشده —
${input.failedChecks.map((c) => `- ${c.name}: ${c.note}`).join("\n") || "- (همه پاس شدند)"}

اسکریپت را اصلاح کن. فقط چیزهایی را عوض کن که ایراد دارند؛ بقیه را دست نزن.`;

  return runAgentJSON({
    agent: "reels-writer",
    system: systemPrompt(lessons, Boolean(input.leadMagnet), input.leadMagnet),
    prompt,
    temperature: 0.5,
    maxOutputTokens: 4000,
    schema: ReelsScriptSchema,
    shapeHint: SHAPE_HINT,
  });
}
