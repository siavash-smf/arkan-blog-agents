import "server-only";
import { runAgentJSON } from "@/lib/ai";
import { lessonsBlockFor } from "./lessons";
import { SeoOutputSchema, type Brief, type SeoOutput } from "./types";
import { runSeoChecks, type SeoCheck } from "./seo-checks";

/**
 * ایجنت ۶ — متخصص سئو (SEO Specialist)
 *
 * دو بخش دارد:
 * ۱. LLM: تولید متادیتا (متا تایتل/دیسکریپشن، اسلاگ، خلاصه، FAQ برای اسکیما)
 * ۲. کد قطعی: چک‌لیست سئو (seo-checks.ts) — اگر چکی رد شود، یک بار به
 *    مدل برمی‌گردیم تا متادیتا را اصلاح کند.
 */

export type SeoResult = { seo: SeoOutput; checks: SeoCheck[] };

const SHAPE = `{
  "slug": "english-slug-with-dashes",
  "metaTitle": "متا تایتل ۳۰ تا ۶۵ کاراکتری",
  "metaDescription": "متا دیسکریپشن ۷۰ تا ۱۶۰ کاراکتری که کاربر را به کلیک ترغیب کند",
  "excerpt": "خلاصه‌ی دو سه جمله‌ای مقاله برای کارت بلاگ",
  "keywords": ["کلمه ۱", "کلمه ۲", "کلمه ۳"],
  "faq": [ { "question": "سؤال رایج", "answer": "پاسخ کوتاه و مفید" } ]
}`;

export async function runSeo(input: {
  brief: Brief;
  contentMd: string;
  existingSlugs: string[];
}): Promise<SeoResult> {
  const lessons = await lessonsBlockFor("seo");

  const system = `تو «متخصص سئو»ی بلاگ آرکان هستی — سئوی فارسی را خوب می‌شناسی: متادیتای طبیعی که هم برای گوگل بهینه است هم کاربر را جذب می‌کند، نه keyword stuffing.${lessons}`;

  const basePrompt = `مقاله‌ی نهایی:
${input.contentMd}

کلمه‌ی کلیدی اصلی: ${input.brief.primaryKeyword}
کلمات فرعی: ${input.brief.secondaryKeywords.join("، ")}

این اسلاگ‌ها قبلاً استفاده شده‌اند (تکراری نده): ${input.existingSlugs.join(", ") || "—"}

متادیتای کامل سئو برای این مقاله بساز:
- اسلاگ: ترجمه/ترنسلیتریشن کوتاه انگلیسی عنوان (فقط حروف کوچک و خط تیره).
- متا تایتل: کلمه‌ی کلیدی اصلی را دربر بگیرد؛ می‌تواند با عنوان مقاله فرق کند.
- FAQ: از سؤال‌هایی که مقاله واقعاً به آن‌ها پاسخ می‌دهد (برای FAQ Schema گوگل).`;

  let seo = await runAgentJSON({
    agent: "seo",
    system,
    prompt: basePrompt,
    schema: SeoOutputSchema,
    shapeHint: SHAPE,
  });

  let checks = runSeoChecks({
    contentMd: input.contentMd,
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    primaryKeyword: input.brief.primaryKeyword,
    slug: seo.slug,
  });

  // اگر چکِ مربوط به متادیتا رد شد، یک دور اصلاح (چک‌های متنِ مقاله کار نویسنده است، نه سئوکار)
  const metaFailures = checks.filter(
    (c) => !c.pass && ["طول متا تایتل", "طول متا دیسکریپشن", "اسلاگ استاندارد"].includes(c.name)
  );
  if (metaFailures.length > 0) {
    seo = await runAgentJSON({
      agent: "seo",
      system,
      prompt: `${basePrompt}

خروجی قبلی‌ات این چک‌های قطعی را رد شد:
${metaFailures.map((f) => `- ${f.name}: ${f.note}`).join("\n")}

متادیتا را طوری اصلاح کن که همه‌ی چک‌ها پاس شوند.`,
      schema: SeoOutputSchema,
      shapeHint: SHAPE,
    });

    checks = runSeoChecks({
      contentMd: input.contentMd,
      metaTitle: seo.metaTitle,
      metaDescription: seo.metaDescription,
      primaryKeyword: input.brief.primaryKeyword,
      slug: seo.slug,
    });
  }

  // تضمین نهایی یکتایی اسلاگ در کد (به وعده‌ی مدل اکتفا نمی‌کنیم)
  if (input.existingSlugs.includes(seo.slug)) {
    seo = { ...seo, slug: `${seo.slug}-${Math.random().toString(36).slice(2, 6)}` };
  }

  return { seo, checks };
}
