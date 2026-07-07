/**
 * چک‌های قطعی سئو — بدون LLM.
 *
 * نکته‌ی آموزشی مهم: هر چیزی را نباید به LLM سپرد. قواعدی که قطعی و
 * قابل‌محاسبه‌اند (طول متا، تعداد H1، حضور کلیدواژه در مقدمه) با کد
 * معمولی هم ارزان‌ترند، هم صددرصد قابل‌اتکا. LLM را برای کارهای
 * «قضاوتی» نگه دارید و قواعد مکانیکی را با کد بسنجید.
 */

export type SeoCheck = { name: string; pass: boolean; note: string };

export function runSeoChecks(input: {
  contentMd: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  slug: string;
}): SeoCheck[] {
  const { contentMd, metaTitle, metaDescription, primaryKeyword, slug } = input;
  const checks: SeoCheck[] = [];

  // دقیقاً یک H1
  const h1Count = (contentMd.match(/^# /gm) ?? []).length;
  checks.push({
    name: "یک H1 یکتا",
    pass: h1Count === 1,
    note: h1Count === 1 ? "مقاله دقیقاً یک تیتر اصلی دارد" : `تعداد H1: ${h1Count} (باید ۱ باشد)`,
  });

  // حداقل ۳ تیتر H2
  const h2Count = (contentMd.match(/^## /gm) ?? []).length;
  checks.push({
    name: "ساختار تیتربندی",
    pass: h2Count >= 3,
    note: `${h2Count} تیتر H2 (حداقل ۳)`,
  });

  // کلمه‌ی کلیدی در ۳۰۰ کاراکتر اول بدنه
  const body = contentMd.replace(/^# .*$/m, "").trim();
  const kwEarly = body.slice(0, 300).includes(primaryKeyword);
  checks.push({
    name: "کلیدواژه در مقدمه",
    pass: kwEarly,
    note: kwEarly
      ? "کلمه‌ی کلیدی اصلی در ابتدای مقاله آمده"
      : `«${primaryKeyword}» در ۳۰۰ کاراکتر اول نیست`,
  });

  // طول متا تایتل
  checks.push({
    name: "طول متا تایتل",
    pass: metaTitle.length >= 30 && metaTitle.length <= 65,
    note: `${metaTitle.length} کاراکتر (بازه‌ی مطلوب ۳۰–۶۵)`,
  });

  // طول متا دیسکریپشن
  checks.push({
    name: "طول متا دیسکریپشن",
    pass: metaDescription.length >= 70 && metaDescription.length <= 160,
    note: `${metaDescription.length} کاراکتر (بازه‌ی مطلوب ۷۰–۱۶۰)`,
  });

  // اسلاگ انگلیسی تمیز
  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 60;
  checks.push({
    name: "اسلاگ استاندارد",
    pass: slugOk,
    note: slugOk ? slug : `اسلاگ نامعتبر: ${slug}`,
  });

  // حداقل طول مقاله (شمارش کلمات تقریبی)
  const wordCount = contentMd.split(/\s+/).length;
  checks.push({
    name: "طول مقاله",
    pass: wordCount >= 600,
    note: `حدود ${wordCount} کلمه (حداقل ۶۰۰)`,
  });

  return checks;
}
