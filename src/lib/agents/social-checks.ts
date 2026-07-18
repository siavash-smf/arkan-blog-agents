import type { Slide } from "@/lib/store";

/**
 * چک‌های قطعی محتوای اجتماعی — بدون LLM.
 *
 * دقیقاً به همان دلیلِ seo-checks.ts: طول کپشن، تعداد اسلاید، قالب هشتگ و
 * وجود لینک، همه قاعده‌های مکانیکی‌اند. LLM را برای قضاوت (لحن، جذابیت
 * قلاب) نگه می‌داریم و شمردن را با کد انجام می‌دهیم — ارزان‌تر و قطعی.
 *
 * ⚠️ نام هر چک به‌صورت رشته‌ی فارسی در ارکستریتور دوباره match می‌شود
 *    (برای انتخاب ایرادهای «قابل تعمیر توسط نویسنده»). اگر نامی را اینجا
 *    عوض کردی، آنجا هم عوض کن — وگرنه بی‌صدا از کار می‌افتد.
 */

export type SocialCheck = { name: string; pass: boolean; note: string };

/**
 * شمارش «کاراکترِ دیده‌شده».
 *
 * نکته‌ی مهم یونیکد: str.length واحدهای UTF-16 را می‌شمارد، پس یک ایموجی
 * ۲ حساب می‌شود و یک کپشن سالم را بی‌دلیل رد می‌کنیم. با [...str] روی
 * نقطه‌کدها پیمایش می‌کنیم تا شمارش به آنچه اینستاگرام نشان می‌دهد نزدیک
 * باشد. نیم‌فاصله (‌) عمداً شمرده می‌شود، چون پلتفرم‌ها هم می‌شمارند.
 */
function charCount(s: string): number {
  return [...s].length;
}

const URL_RE = /(https?:\/\/|www\.)/i;
const HASHTAG_RE = /^#[^\s#]+$/;

/** خط‌های ناخالی، بدون فاصله‌های اضافی */
function lines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** پاراگراف‌ها = بلوک‌های جداشده با خط خالی */
function paragraphs(s: string): string[] {
  return s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * «قلاب» = اولین جمله‌ی متن.
 *
 * نکته‌ی مهم که دو بار در عمل به آن خوردیم: واحد اندازه‌گیری را باید درست
 * انتخاب کرد. اولین نسخه «خط اول» را می‌سنجید، ولی کپی‌رایتر کپشن را در یک
 * بلوک بدون شکست خط می‌نوشت، پس «خط اول» یعنی کل ۴۷۲ کاراکتر — در حالی که
 * جمله‌ی اول (۴۴ کاراکتر) قلاب کاملاً سالمی بود.
 *
 * پس اول تا اولین شکست خط می‌بریم، بعد تا اولین پایانه‌ی جمله. هرکدام
 * زودتر بیاید. چک قطعیِ غلط بدتر از نداشتن چک است: بازنویسی بی‌دلیل
 * راه می‌اندازد و به مدل می‌گوید چیزی را درست کند که خراب نیست.
 */
function firstSentence(s: string): string {
  const firstLine = lines(s)[0] ?? "";
  const m = firstLine.match(/^[\s\S]*?[؟?!.]/);
  return (m ? m[0] : firstLine).trim();
}

/* ── اینستاگرام ─────────────────────────────────────────── */

export function runInstagramChecks(input: {
  caption: string;
  slides: Slide[];
  hashtags: string[];
}): SocialCheck[] {
  const { caption, slides, hashtags } = input;
  const checks: SocialCheck[] = [];

  // قلاب: اینستاگرام حدود ۱۲۵ کاراکتر اول را قبل از «... بیشتر» نشان می‌دهد،
  // پس جمله‌ی اول باید کامل داخل همان جا بنشیند و مستقل معنی بدهد.
  const hook = firstSentence(caption);
  const hookLen = charCount(hook);
  checks.push({
    name: "قلاب در ۱۲۵ کاراکتر اول",
    pass: hookLen > 0 && hookLen <= 125,
    note:
      hookLen === 0
        ? "کپشن خالی است"
        : `«${hook.slice(0, 40)}…» — ${hookLen} کاراکتر (سقف ۱۲۵)`,
  });

  checks.push({
    name: "تعداد اسلایدها",
    pass: slides.length >= 5 && slides.length <= 8,
    note: `${slides.length} اسلاید (بازه‌ی مطلوب ۵–۸)`,
  });

  // متن اسلاید باید روی تصویر خوانا باشد
  const longSlide = slides.findIndex(
    (s) => charCount(s.heading) > 40 || charCount(s.text) > 140
  );
  checks.push({
    name: "طول متن اسلایدها",
    pass: longSlide === -1,
    note:
      longSlide === -1
        ? "همه‌ی اسلایدها در حد خوانایی روی تصویرند"
        : `اسلاید ${longSlide + 1} بلند است (تیتر ≤۴۰ و متن ≤۱۴۰ کاراکتر)`,
  });

  // ⚠️ اینجا عمداً چکی برای «آیا اسلاید آخر دعوت به اقدام دارد؟» نداریم.
  // نسخه‌ی اول این فایل چنین چکی داشت که دنبال کلیدواژه‌هایی مثل «مشاوره»
  // یا «بایو» می‌گشت — و روی اسلایدی که دعوتش کاملاً روشن بود («اگر
  // می‌خواهید… ما کنار شما هستیم») رد شد، چون هیچ‌کدام از آن کلمه‌ها را
  // نداشت. درسش همان چیزی است که بالای این فایل نوشته‌ایم، فقط از سمت
  // مخالف: «وجود دعوت به اقدام» یک قضاوت است، نه یک قاعده‌ی مکانیکی.
  // تطبیق کلیدواژه‌ای روی فارسی برایش ابزار غلطی است. این معیار به روبریک
  // ویراستار اجتماعی سپرده شده (platformFit).

  checks.push({
    name: "تعداد هشتگ‌ها",
    pass: hashtags.length >= 8 && hashtags.length <= 15,
    note: `${hashtags.length} هشتگ (بازه‌ی مطلوب ۸–۱۵)`,
  });

  const badTags = hashtags.filter((h) => !HASHTAG_RE.test(h));
  const hasDupes = new Set(hashtags).size !== hashtags.length;
  checks.push({
    name: "قالب هشتگ‌ها",
    pass: badTags.length === 0 && !hasDupes,
    note:
      badTags.length > 0
        ? `هشتگ نامعتبر: ${badTags.join("، ")}`
        : hasDupes
          ? "هشتگ تکراری وجود دارد"
          : "همه‌ی هشتگ‌ها معتبر و یکتا هستند",
  });

  const hasUrl = URL_RE.test(caption);
  checks.push({
    name: "بدون لینک در کپشن",
    pass: !hasUrl,
    note: hasUrl
      ? "اینستاگرام لینک کپشن را کلیک‌پذیر نمی‌کند — به‌جایش «لینک در بایو»"
      : "کپشن لینک ندارد",
  });

  const capLen = charCount(caption);
  checks.push({
    name: "طول کپشن",
    pass: capLen >= 150 && capLen <= 2200,
    note: `${capLen} کاراکتر (بازه‌ی مطلوب ۱۵۰–۲۲۰۰)`,
  });

  return checks;
}

/* ── ریلز ───────────────────────────────────────────────── */

/** شمارش کلمه — مبنای تخمین زمان گفتار */
function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** هر ۱۴۰ کلمه‌ی فارسی حدوداً یک دقیقه بلندخوانی */
const WORDS_PER_MINUTE = 140;

export function runReelsChecks(input: {
  hook: string;
  body: string;
  cta: string;
  ctaId: string;
  onScreenText: string;
  hashtags: string[];
  /** شناسه‌های مجاز، از فهرست reels-cta */
  allowedCtaIds: string[];
}): SocialCheck[] {
  const { hook, body, cta, onScreenText, hashtags } = input;
  const checks: SocialCheck[] = [];

  const script = `${hook}\n\n${body}\n\n${cta}`;
  const words = wordCount(script);
  const seconds = Math.round((words / WORDS_PER_MINUTE) * 60);

  // سقف مطلق: زیر ۳ دقیقه
  checks.push({
    name: "سقف طول اسکریپت",
    pass: words <= 400,
    note: `${words} کلمه ≈ ${seconds} ثانیه (سقف ۴۰۰ کلمه / ۳ دقیقه)`,
  });

  // بازه‌ی کاربردی. عمداً تا ۳۰۰ باز است، نه ۲۲۰:
  // دستورالعمل اجازه می‌دهد محتوای سنگین بلندتر شود، و چکِ سخت‌گیرترِ
  // لازم، بازنویسیِ بی‌دلیل راه می‌اندازد.
  checks.push({
    name: "طول مناسب ریلز",
    pass: words >= 100 && words <= 300,
    note: `${words} کلمه ≈ ${seconds} ثانیه (بازه‌ی مطلوب ۱۰۰–۳۰۰ کلمه)`,
  });

  // قلاب ۳ تا ۵ ثانیه ≈ حداکثر ۲۰ کلمه
  const hookWords = wordCount(hook);
  checks.push({
    name: "قلاب کوتاه",
    pass: hookWords > 0 && hookWords <= 20,
    note: `${hookWords} کلمه ≈ ${Math.round((hookWords / WORDS_PER_MINUTE) * 60)} ثانیه (سقف ۲۰ کلمه)`,
  });

  // شروع با سلام و مقدمه‌چینی، صریحاً ممنوع است
  const OPENERS = ["سلام", "درود", "وقت بخیر", "خب،", "خب ", "در این ویدیو", "امروز می‌خواهیم"];
  const opener = OPENERS.find((o) => hook.trimStart().startsWith(o));
  checks.push({
    name: "بدون مقدمه‌چینی در قلاب",
    pass: !opener,
    note: opener ? `قلاب با «${opener.trim()}» شروع می‌شود` : "قلاب مستقیم سر اصل مطلب می‌رود",
  });

  // راهنمای صحنه نباید داخل اسکریپت باشد.
  // فقط کروشه را می‌گیریم: در گفتار فارسی عملاً استفاده نمی‌شود، پس
  // خطای مثبتِ کاذب نمی‌دهد — برخلاف پرانتز که در جمله‌ی عادی می‌آید.
  const stageDir = script.match(/\[[^\]]*\]/);
  checks.push({
    name: "بدون راهنمای صحنه",
    pass: !stageDir,
    note: stageDir
      ? `راهنمای صحنه در متن: «${stageDir[0].slice(0, 40)}»`
      : "اسکریپت فقط شامل چیزی است که گفته می‌شود",
  });

  // CTA باید از فهرست مجاز باشد — جلوی ساختن CTA خودسر را می‌گیرد
  const ctaOk = input.allowedCtaIds.includes(input.ctaId);
  checks.push({
    name: "دعوت به اقدام از فهرست مجاز",
    pass: ctaOk,
    note: ctaOk
      ? `CTA انتخاب‌شده: ${input.ctaId}`
      : `«${input.ctaId}» در فهرست مجاز نیست (${input.allowedCtaIds.join("، ")})`,
  });

  const onScreenLen = charCount(onScreenText);
  checks.push({
    name: "طول متن روی تصویر",
    pass: onScreenLen > 0 && onScreenLen <= 45,
    note: `${onScreenLen} کاراکتر (سقف ۴۵ — روی ویدیو باید یک‌نگاهی خوانده شود)`,
  });

  // املای محاوره‌ای — برندگاید آرکان فارسی کتابی با خطاب «شما» می‌خواهد.
  // این فهرست عمداً کوتاه و بی‌ابهام است: همه واژه‌های کاملی هستند که
  // شکل کتابی مشخصی دارند، پس تطبیقِ کلمه‌کامل خطای کاذب نمی‌دهد.
  // (برخلاف پسوندهایی مثل «تون» که داخل «ستون» هم پیدا می‌شوند.)
  const COLLOQUIAL = [
    "اگه", "دیگه", "میشه", "نمیشه", "بشه", "کنه", "بکنه", "میکنه",
    "اینجوری", "این‌جوری", "چیه", "یه", "خیلیا", "اینا", "واسه", "بریم",
  ];
  const found = COLLOQUIAL.filter((w) =>
    new RegExp(`(^|[\\s،.!؟:؛«»()"])${w}([\\s،.!؟:؛«»()"]|$)`).test(script)
  );
  checks.push({
    name: "فارسی کتابی (نه محاوره‌ای)",
    pass: found.length === 0,
    note:
      found.length > 0
        ? `شکل محاوره‌ای: ${found.join("، ")} — طبق برندگاید باید کتابی نوشته شود`
        : "متن با املای کتابی نوشته شده",
  });

  const badTags = hashtags.filter((h) => !HASHTAG_RE.test(h));
  checks.push({
    name: "تعداد هشتگ‌ها",
    pass: hashtags.length >= 3 && hashtags.length <= 5 && badTags.length === 0,
    note:
      badTags.length > 0
        ? `هشتگ نامعتبر: ${badTags.join("، ")}`
        : `${hashtags.length} هشتگ (بازه‌ی مطلوب ۳–۵)`,
  });

  return checks;
}

/* ── لینکدین ────────────────────────────────────────────── */

export function runLinkedinChecks(input: {
  body: string;
  hashtags: string[];
}): SocialCheck[] {
  const { body, hashtags } = input;
  const checks: SocialCheck[] = [];

  // لینکدین حدود سه خط رندرشده (~۲۱۰ کاراکتر) را قبل از «... بیشتر ببینید»
  // نشان می‌دهد. چون نویسنده پاراگراف‌ها را با خط خالی جدا می‌کند، عملاً
  // پاراگراف اول همان چیزی است که دیده می‌شود — پس همان را می‌سنجیم.
  // (نسخه‌ی اول این چک «سه خط ناخالی اول» را می‌گرفت که در عمل سه پاراگراف
  //  کامل می‌شد و همیشه رد می‌شد.)
  const hookPara = paragraphs(body)[0] ?? "";
  const hookLen = charCount(hookPara);
  checks.push({
    name: "قلاب سه‌خطی",
    pass: hookLen > 0 && hookLen <= 210,
    note:
      hookLen === 0
        ? "متن خالی است"
        : `${hookLen} کاراکتر پیش از «بیشتر ببینید» (سقف ۲۱۰)`,
  });

  const bodyLen = charCount(body);
  checks.push({
    name: "طول پست",
    pass: bodyLen >= 900 && bodyLen <= 1800,
    note: `${bodyLen} کاراکتر (بازه‌ی مطلوب ۹۰۰–۱۸۰۰)`,
  });

  const hasUrl = URL_RE.test(body);
  checks.push({
    name: "بدون لینک در متن",
    pass: !hasUrl,
    note: hasUrl
      ? "لینک باید در کامنت اول بیاید، نه در متن پست (لینک بیرونی reach را کم می‌کند)"
      : "متن پست لینک ندارد",
  });

  const paras = paragraphs(body);
  const longest = paras.reduce((m, p) => Math.max(m, charCount(p)), 0);
  checks.push({
    name: "پاراگراف‌های کوتاه",
    pass: longest <= 320,
    note: `بلندترین پاراگراف ${longest} کاراکتر (سقف ۳۲۰)`,
  });

  checks.push({
    name: "فاصله‌گذاری پاراگراف‌ها",
    pass: paras.length >= 4,
    note: `${paras.length} پاراگراف (حداقل ۴ — دیوارِ متن در فید خوانده نمی‌شود)`,
  });

  // لینکدین مارک‌داون رندر نمی‌کند؛ ستاره و شارپ خام دیده می‌شوند.
  // عمداً فقط * و # را می‌گیریم — خط تیره در فارسی کاربرد مشروع دارد و
  // گرفتنش خطای کاذب می‌ساخت. (درسِ «چک قطعیِ غلط بدتر از نداشتن چک».)
  const md = body.match(/^\s*(\*+|#+)\s/m) || body.match(/\*\*[^*]+\*\*/);
  checks.push({
    name: "بدون نشانه‌گذاری مارک‌داون",
    pass: !md,
    note: md
      ? `«${md[0].trim()}» — لینکدین مارک‌داون را رندر نمی‌کند و خام دیده می‌شود`
      : "متن بدون نشانه‌گذاری مارک‌داون است",
  });

  const badTags = hashtags.filter((h) => !HASHTAG_RE.test(h));
  checks.push({
    name: "تعداد هشتگ‌ها",
    pass: hashtags.length >= 3 && hashtags.length <= 5 && badTags.length === 0,
    note:
      badTags.length > 0
        ? `هشتگ نامعتبر: ${badTags.join("، ")}`
        : `${hashtags.length} هشتگ (بازه‌ی مطلوب ۳–۵)`,
  });

  // پایان با پرسش، برای دعوت به گفت‌وگو. خط هشتگ‌ها را کنار می‌گذاریم.
  const meaningful = paras.filter((p) => !p.split(/\s+/).every((w) => w.startsWith("#")));
  const lastPara = meaningful[meaningful.length - 1] ?? "";
  const endsWithQuestion = /[؟?]\s*$/.test(lastPara);
  checks.push({
    name: "پایان با دعوت به گفت‌وگو",
    pass: endsWithQuestion,
    note: endsWithQuestion
      ? "پست با یک پرسش تمام می‌شود"
      : "پست با پرسش تمام نمی‌شود — گفت‌وگو در کامنت‌ها راه نمی‌افتد",
  });

  return checks;
}
