import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { BRAND_VOICE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { ReviewSchema, type Brief, type Review } from "./types";

/**
 * ایجنت ۵ — ویراستار (Editor)
 *
 * وظیفه: قضاوت کیفیت پیش‌نویس با یک روبریک صریح و دادن ایرادهای «قابل اجرا».
 *
 * نکته‌ی آموزشی — الگوی Generator/Critic:
 * نویسنده و ویراستار عمداً دو ایجنت جدا هستند. مدلی که خودش متن را نوشته،
 * در نقد آن سخت‌گیر نیست (سوگیری خودارزیابی). ویراستارِ جدا با روبریک
 * عددی، دروازه‌ی کیفیت (quality gate) پایپ‌لاین است: امتیاز پایین → برگشت
 * به نویسنده برای بازنویسی.
 */

/** حد نصاب پذیرش — زیر این امتیاز، پیش‌نویس به نویسنده برمی‌گردد */
export const APPROVE_THRESHOLD = 75;

export async function runEditor(input: {
  brief: Brief;
  draft: string;
}): Promise<Review> {
  const lessons = await lessonsBlockFor("editor");

  const system = `تو «ویراستار ارشد» بلاگ آرکان هستی — سخت‌گیر اما منصف. کارت قضاوت کیفیت است، نه بازنویسی. ایرادهایی که می‌گیری باید آن‌قدر مشخص باشند که نویسنده دقیقاً بداند چه چیزی را کجا عوض کند.

${BRAND_VOICE}${lessons}`;

  const prompt = `بریف مقاله:
عنوان: ${input.brief.title}
مخاطب: ${input.brief.audience}
کلمه‌ی کلیدی اصلی: ${input.brief.primaryKeyword}
طول هدف: ${input.brief.targetWordCount} کلمه

— پیش‌نویس —
${input.draft}

پیش‌نویس را با این روبریک ارزیابی کن (هر معیار ۰ تا ۱۰):
- clarity: شفافیت و روانی — آیا هر پاراگراف یک حرف روشن دارد؟
- brandVoice: تطابق با لحن برند — بدون اغراق، بدون تبلیغ‌زدگی؟
- usefulness: سودمندی عملی — خواننده بعد از مقاله «قدم بعدی» را می‌داند؟
- structure: ساختار — تطابق با بریف، تیترهای درست، مقدمه و جمع‌بندی؟
- persian: فارسی طبیعی — بدون ترجمه‌زدگی و جمله‌های ماشینی؟

score = مجموع پنج معیار × ۲ (یعنی ۰ تا ۱۰۰).
اگر score زیر ${APPROVE_THRESHOLD} بود verdict را "revise" بگذار و در issues دقیق بگو چه چیزهایی باید اصلاح شود؛ وگرنه "approve".`;

  return runAgentJSON({
    agent: "editor",
    system,
    prompt,
    temperature: 0.3,
    schema: ReviewSchema,
    shapeHint: `{
  "score": 82,
  "rubric": { "clarity": 8, "brandVoice": 9, "usefulness": 8, "structure": 8, "persian": 8 },
  "issues": ["ایراد مشخص و قابل اجرا"],
  "verdict": "approve"
}`,
  });
}
