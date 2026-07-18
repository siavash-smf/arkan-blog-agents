import { z } from "zod";

/**
 * قرارداد خروجی هر ایجنت — با Zod تعریف می‌شود.
 *
 * نکته‌ی آموزشی: در سیستم مولتی‌ایجنت، خروجی هر ایجنت «ورودی» ایجنت بعدی
 * است. اگر این قرارداد شل باشد، خطای یک ایجنت به همه‌ی زنجیره سرایت می‌کند.
 * اسکیمای صریح + اعتبارسنجی، همان کاری است که interface در کد معمولی می‌کند.
 */

/* ── ۱. ایده‌یاب ─────────────────────────────────────────── */

export const IdeaSchema = z.object({
  title: z.string().min(4),
  angle: z.string(),
  searchIntent: z.string(),
  score: z.number().min(0).max(10),
  reason: z.string(),
});

export const IdeaScoutOutputSchema = z.object({
  ideas: z.array(IdeaSchema).min(3),
});

export type Idea = z.infer<typeof IdeaSchema>;
export type IdeaScoutOutput = z.infer<typeof IdeaScoutOutputSchema>;

/* ── ۲. استراتژیست ──────────────────────────────────────── */

export const BriefSchema = z.object({
  title: z.string(),
  audience: z.string(),
  searchIntent: z.string(),
  primaryKeyword: z.string(),
  secondaryKeywords: z.array(z.string()).min(2).max(8),
  outline: z
    .array(
      z.object({
        heading: z.string(),
        points: z.array(z.string()),
      })
    )
    .min(3),
  targetWordCount: z.number().min(600).max(3000),
  cta: z.string(),
});

export type Brief = z.infer<typeof BriefSchema>;

/* ── ۳. پژوهشگر ─────────────────────────────────────────── */

export const ResearchSchema = z.object({
  keyFacts: z.array(z.string()).min(3),
  examples: z.array(z.string()),
  commonQuestions: z.array(z.string()).min(2),
  angleNotes: z.string(),
});

export type Research = z.infer<typeof ResearchSchema>;

/* ── ۵. ویراستار ────────────────────────────────────────── */

export const ReviewSchema = z.object({
  /** امتیاز کل ۰ تا ۱۰۰ */
  score: z.number().min(0).max(100),
  /** امتیاز هر معیار روبریک، ۰ تا ۱۰ */
  rubric: z.object({
    clarity: z.number().min(0).max(10),
    brandVoice: z.number().min(0).max(10),
    usefulness: z.number().min(0).max(10),
    structure: z.number().min(0).max(10),
    persian: z.number().min(0).max(10),
  }),
  /** فهرست مشکلات مشخص که نویسنده باید اصلاح کند */
  issues: z.array(z.string()),
  verdict: z.enum(["approve", "revise"]),
});

export type Review = z.infer<typeof ReviewSchema>;

/* ── ۶. متخصص سئو ───────────────────────────────────────── */

/**
 * کوتاه‌کردن قطعی متن تا سقف کاراکتر — ترجیحاً روی مرز کلمه.
 *
 * نکته‌ی آموزشی: طول رشته یک محدودیتِ کاملاً قطعی است و LLM‌ها (به‌ویژه در
 * فارسی) نمی‌توانند کاراکتر بشمارند. پس به‌جای `.max()` که خروجیِ چند کاراکتر
 * بلندتر را با استثنا رد می‌کند و کل اجرا را می‌کُشد، همین‌جا در کد مهارش
 * می‌کنیم. همان اصلِ «کار قطعی را به مدل نسپار» که در seo-checks هم دیدیم.
 */
export function clampText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  // یک کاراکتر برای «…» کنار می‌گذاریم و تا آخرین فاصله عقب می‌رویم تا وسط کلمه نبُریم
  const slice = t.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return base.trimEnd() + "…";
}

export const SeoOutputSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "اسلاگ باید حروف کوچک انگلیسی و خط تیره باشد"),
  // سقف طول با clampText مهار می‌شود، نه با رد کردن؛ min برای رد خروجیِ ناقص می‌ماند
  // (نوشتنِ «بلندتر» کاری است که مدل قابل‌اعتماد انجام می‌دهد، برخلاف شمارش کاراکتر).
  metaTitle: z.string().min(10).transform((s) => clampText(s, 65)),
  metaDescription: z.string().min(50).transform((s) => clampText(s, 160)),
  excerpt: z.string().min(30),
  keywords: z.array(z.string()).min(3).max(10),
  faq: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .min(2)
    .max(6),
});

export type SeoOutput = z.infer<typeof SeoOutputSchema>;

/* ── ۸. منتقد (خودبهبودی) ───────────────────────────────── */

/**
 * ایجنت‌هایی که می‌توانند «درس» بگیرند.
 *
 * قاعده: فقط ایجنت‌هایی که پرامپت دارند. ناشر و منتقد اینجا نیستند چون
 * کدِ قطعی‌اند یا خودشان درس‌ساز‌ند — درس دادن به آن‌ها بی‌معنی است.
 *
 * ⚠️ اگر ایجنت جدیدی ساختی و اینجا اضافه‌اش نکردی، منتقد برایش هیچ درسی
 * تولید نمی‌کند و هیچ خطایی هم نمی‌بینی: z.enum خروجی را رد می‌کند، یک
 * retry می‌خورد، شکست می‌خورد، و try/catch گام منتقد آن را قورت می‌دهد.
 */
export const AGENT_IDS = [
  "idea-scout",
  "strategist",
  "researcher",
  "writer",
  "editor",
  "seo",
  // فاز ۴ — محتوای شبکه‌های اجتماعی
  "repurposer",
  "social-idea-scout",
  "instagram-strategist",
  "linkedin-angle-finder",
  "instagram-writer",
  "linkedin-writer",
  "reels-writer",
  "social-editor",
  // فاز ۵ — کمپین چندکاناله
  "campaign-strategist",
] as const;

export const CriticOutputSchema = z.object({
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  /** درس‌هایی که باید در اجراهای بعدی رعایت شوند — حداکثر ۳ تا، هرکدام برای یک ایجنت */
  lessons: z
    .array(
      z.object({
        agent: z.enum(AGENT_IDS),
        lesson: z.string().min(10),
      })
    )
    .max(3),
});

/* ── فاز ۴: محتوای شبکه‌های اجتماعی ──────────────────────── */

/**
 * ایده‌ی محتوای اجتماعی — خروجی «ایده‌یاب اجتماعی».
 *
 * چرا اسکیمای جدا و نه استفاده از IdeaSchema با یک پارامتر کانال؟
 * چون IdeaSchema فیلد `searchIntent` دارد و هر سه معیار امتیازدهی ایده‌یاب
 * بلاگ حول «آیا این را در گوگل جستجو می‌کنند؟» می‌چرخد. برای فید
 * اینستاگرام این سؤال بی‌معنی است؛ سؤال درست «آیا اسکرول را متوقف
 * می‌کند؟» است. یک flag روی ایده‌یاب یعنی یک فیلد بی‌معنا در اسکیما
 * به‌علاوه‌ی پرامپت شاخه‌دار — دو ایجنت کوتاه و صریح بهتر است.
 */
export const SocialIdeaSchema = z.object({
  title: z.string().min(4),
  /** قلاب پیشنهادی — همان جمله‌ای که اسکرول را متوقف می‌کند */
  hook: z.string().min(10),
  /** دردی از مخاطب که این ایده به آن می‌پردازد */
  painPoint: z.string(),
  score: z.number().min(0).max(10),
  reason: z.string(),
});

export const SocialIdeaScoutOutputSchema = z.object({
  ideas: z.array(SocialIdeaSchema).min(3),
});

export type SocialIdea = z.infer<typeof SocialIdeaSchema>;

/* ── بریف و خروجی‌های اجتماعی ────────────────────────────── */

/**
 * بریف اجتماعی — خروجی «بازآفرین».
 *
 * چرا یک بریف مشترک برای هر دو پلتفرم؟ چون پیام باید یکی باشد و فقط
 * لباسش عوض شود. اگر هر کپی‌رایتر مستقیم از روی مقاله می‌نوشت، دو محتوای
 * بی‌ربط درمی‌آمد. همان نقشی که BriefSchema در پایپ‌لاین بلاگ دارد.
 */
export const SocialBriefSchema = z.object({
  /** تنها ایده‌ای که ارزش انتقال به فید را دارد */
  coreMessage: z.string().min(20),
  audience: z.string(),
  /** هر نکته یک «ادعا»ی مستقل، نه یک تیتر */
  keyPoints: z.array(z.string()).min(3).max(6),
  /** زاویه‌ی قلاب — درد مخاطب، نه موضوع مقاله */
  hookAngle: z.string().min(10),
  /** شاهد/مثال، فقط از دل مقاله‌ی مبدأ */
  proofPoint: z.string(),
  cta: z.string(),
});

export type SocialBrief = z.infer<typeof SocialBriefSchema>;

/** یک اسلاید کاروسل — سقف طول‌ها مثل سئو با clampText مهار می‌شود */
export const SlideSchema = z.object({
  kicker: z.string().transform((s) => clampText(s, 24)),
  heading: z.string().min(3).transform((s) => clampText(s, 40)),
  text: z.string().transform((s) => clampText(s, 140)),
});

export const InstagramCarouselSchema = z.object({
  title: z.string().min(4),
  /** ۱۲۵ کاراکتر اولش قبل از «... بیشتر» دیده می‌شود */
  caption: z.string().min(80).transform((s) => clampText(s, 2200)),
  // ⚠️ بازه‌ی ۵–۸ در constraint جدول social_posts هم هست (supabase/schema.sql).
  //    اگر یکی را عوض کردی، آن یکی را هم عوض کن.
  slides: z.array(SlideSchema).min(5).max(8),
  hashtags: z.array(z.string()).min(8).max(15),
  cta: z.string().min(5),
});

export type InstagramCarousel = z.infer<typeof InstagramCarouselSchema>;

export const LinkedInPostSchema = z.object({
  title: z.string().min(4),
  /** بدنه‌ی پست؛ پاراگراف‌ها با خط خالی از هم جدا می‌شوند */
  body: z.string().min(400).transform((s) => clampText(s, 2800)),
  hashtags: z.array(z.string()).min(3).max(5),
  cta: z.string().min(5),
});

export type LinkedInPost = z.infer<typeof LinkedInPostSchema>;

/* ── فاز ۵: کمپین چندکاناله ─────────────────────────────── */

/**
 * روایت مادر کمپین — چیزی که همه‌ی کانال‌ها از آن مشتق می‌شوند.
 *
 * چرا این لایه لازم است؟ بدون آن، اگر چهار پایپ‌لاین را با یک «موضوع»
 * مشترک اجرا کنیم، چهار محتوای بی‌ربط با یک برچسب مشترک می‌گیریم. روایت
 * مادر همان چیزی است که کمپین را از «چند تولید هم‌زمان» جدا می‌کند.
 */
export const CampaignNarrativeSchema = z.object({
  /** جمله‌ای که کل کمپین حول آن می‌چرخد */
  bigIdea: z.string().min(20),
  audience: z.string(),
  /** تنشی که کمپین به آن می‌پردازد */
  tension: z.string().min(10),
  /** پاسخ آرکان به آن تنش */
  resolution: z.string().min(10),
  /** ۳ تا ۵ ستون محتوایی که بین کانال‌ها تقسیم می‌شوند */
  pillars: z.array(z.string()).min(3).max(5),
  /** موضوع پیشنهادی برای مقاله‌ی بلاگ */
  blogAngle: z.string().min(10),
  /** زاویه‌ی کاروسل اینستاگرام */
  instagramAngle: z.string().min(10),
  /** مشاهده/زاویه‌ی پست لینکدین */
  linkedinAngle: z.string().min(10),
});

export type CampaignNarrative = z.infer<typeof CampaignNarrativeSchema>;

/* ── ریلز ───────────────────────────────────────────────── */

/**
 * اسکریپت ریلز — چیزی که قرار است بلند خوانده شود.
 *
 * سه بخش جدا نگه داشته می‌شوند (نه یک رشته‌ی یکپارچه) چون هر بخش قاعده‌ی
 * خودش را دارد و چک‌های قطعی باید بتوانند جداگانه بسنجندشان. چسباندنشان
 * به هم کارِ ناشر است — یعنی کد، نه مدل.
 */
export const ReelsScriptSchema = z.object({
  title: z.string().min(4),
  /** قلاب ۳ تا ۵ ثانیه‌ای — کوتاه، بدون سلام و مقدمه */
  hook: z.string().min(10).transform((s) => clampText(s, 220)),
  /** بدنه‌ی آموزشی */
  body: z.string().min(150),
  /** جمله‌ی دعوت به اقدام، همان‌طور که گفته می‌شود */
  cta: z.string().min(10),
  /** شناسه‌ی CTA انتخاب‌شده از فهرست reels-cta.ts */
  ctaId: z.string().min(2),
  /** یک جمله: چرا این CTA؟ — بیرون از اسکریپت */
  ctaReason: z.string().min(10),
  /** متن روی فریم قلاب — کوتاه، چون روی ویدیو خوانده می‌شود */
  onScreenText: z.string().min(3).transform((s) => clampText(s, 45)),
  /** کپشن پیشنهادی — در ریلز جدا از خودِ اسکریپت است */
  caption: z.string().min(40).transform((s) => clampText(s, 2200)),
  hashtags: z.array(z.string()).min(3).max(5),
});

export type ReelsScript = z.infer<typeof ReelsScriptSchema>;

/** روبریک ویراستار اجتماعی — معیارها عمداً با ویراستار بلاگ فرق دارند */
export const SocialReviewSchema = z.object({
  score: z.number().min(0).max(100),
  rubric: z.object({
    hook: z.number().min(0).max(10),
    platformFit: z.number().min(0).max(10),
    brandVoice: z.number().min(0).max(10),
    clarity: z.number().min(0).max(10),
    persian: z.number().min(0).max(10),
  }),
  issues: z.array(z.string()),
  verdict: z.enum(["approve", "revise"]),
});

export type SocialReview = z.infer<typeof SocialReviewSchema>;

export type CriticOutput = z.infer<typeof CriticOutputSchema>;
