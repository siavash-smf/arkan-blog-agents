import "server-only";

/**
 * تهیه‌ی ماده‌ی خام ریلز — کد قطعی، بدون LLM.
 *
 * ورودی یا یک لینک است یا یک متن. اگر لینک بود، محتوایش را می‌خوانیم و
 * تمیز می‌کنیم؛ اگر متن بود، همان را برمی‌گردانیم.
 *
 * نکته‌ی آموزشی: گرفتن و تمیزکردن HTML هیچ قضاوتی لازم ندارد، پس کار مدل
 * نیست. مدل جایی وارد می‌شود که باید تصمیم بگیرد «کدام نکته ارزش ویدیو
 * دارد» — نه جایی که باید تگ حذف کند.
 */

export type ReelsSource = {
  /** متن تمیزشده‌ای که نویسنده می‌خواند */
  text: string;
  /** برای نمایش در تایم‌لاین و گزارش منتقد */
  origin: string;
};

/**
 * فقط http/https، و نه آدرس‌های داخلی شبکه.
 *
 * چرا؟ این تابع یک URL دلخواهِ کاربر را از سمت سرور fetch می‌کند. بدون این
 * گارد، می‌شود سرور را وادار کرد به آدرس‌های داخلی (localhost، رنج‌های
 * خصوصی، متادیتای ابری) درخواست بزند — حمله‌ی SSRF. استودیو با رمز
 * محافظت می‌شود، ولی گاردِ ارزان را نباید کنار گذاشت.
 */
function assertSafeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("لینک معتبر نیست.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("فقط لینک‌های http و https پشتیبانی می‌شوند.");
  }

  const host = url.hostname.toLowerCase();
  const isPrivate =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  if (isPrivate) throw new Error("آدرس‌های داخلی شبکه مجاز نیستند.");
  return url;
}

/** حذف تگ‌ها و فشرده‌کردن فاصله‌ها — کافی برای مقاله‌های معمولی وب */
function htmlToText(html: string): string {
  return html
    // بخش‌هایی که اصلاً متن خواندنی نیستند
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // شکست خط معنادار را نگه می‌داریم تا پاراگراف‌ها به هم نچسبند
    .replace(/<\/(p|div|section|article|h[1-6]|li|br)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    // موجودیت‌های رایج
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const MIN_USEFUL_CHARS = 200;

export async function prepareReelsSource(input: {
  sourceUrl?: string | null;
  sourceText?: string | null;
}): Promise<ReelsSource> {
  const text = input.sourceText?.trim();
  if (text) {
    if (text.length < 40) {
      throw new Error("متن ورودی خیلی کوتاه است؛ چند جمله‌ی بیشتر بدهید.");
    }
    return { text, origin: "متن ورودی کاربر" };
  }

  const raw = input.sourceUrl?.trim();
  if (!raw) throw new Error("باید یک لینک یا یک متن بدهید.");

  const url = assertSafeUrl(raw);

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: {
        // بعضی سایت‌ها بدون UA پاسخ نمی‌دهند
        "User-Agent": "Mozilla/5.0 (compatible; ArkanContentStudio/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "خواندن لینک ناموفق بود (خطای شبکه یا timeout). متن مطلب را مستقیم در کادر بچسبانید."
    );
  }

  if (!res.ok) {
    throw new Error(
      `خواندن لینک ناموفق بود (کد ${res.status}). متن مطلب را مستقیم در کادر بچسبانید.`
    );
  }

  const body = htmlToText(await res.text());

  // صفحه‌های جاوااسکریپتی یا محافظت‌شده عملاً متنی برنمی‌گردانند.
  // به‌جای اینکه نویسنده از هیچ چیزی بسازد، صریح شکست می‌خوریم.
  if (body.length < MIN_USEFUL_CHARS) {
    throw new Error(
      "از این لینک متن قابل‌استفاده‌ای استخراج نشد (احتمالاً صفحه جاوااسکریپتی است). متن مطلب را مستقیم در کادر بچسبانید."
    );
  }

  // سقف، تا پرامپت متورم نشود
  return { text: body.slice(0, 12000), origin: url.href };
}
