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

export const AGENT_IDS = [
  "idea-scout",
  "strategist",
  "researcher",
  "writer",
  "editor",
  "seo",
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

export type CriticOutput = z.infer<typeof CriticOutputSchema>;
