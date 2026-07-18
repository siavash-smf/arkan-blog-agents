/**
 * تایپ‌های مشترک لایه‌ی ذخیره‌سازی.
 *
 * نکته‌ی آموزشی: کل سیستم فقط با این interface کار می‌کند (الگوی Adapter).
 * دو پیاده‌سازی داریم: Supabase (برای پروداکشن) و حافظه‌ی موقت (برای اجرای
 * محلی بدون هیچ تنظیمی). ایجنت‌ها هیچ‌وقت مستقیم به دیتابیس وصل نمی‌شوند.
 */

export type PostStatus = "draft" | "published";

export type FaqItem = { question: string; answer: string };

export type Post = {
  id: string;
  runId: string | null;
  title: string;
  slug: string;
  excerpt: string;
  /** متن کامل مقاله به مارک‌داون */
  contentMd: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  faq: FaqItem[];
  /** امتیاز نهایی ویراستار (۰ تا ۱۰۰) */
  score: number | null;
  status: PostStatus;
  createdAt: string;
  publishedAt: string | null;
};

export type StepStatus = "running" | "done" | "error" | "skipped";

/** رکورد یک گام از پایپ‌لاین — برای نمایش زنده در استودیو */
export type StepRecord = {
  /** شناسه‌ی ایجنت، مثل idea-scout یا writer */
  agent: string;
  /** نام فارسی برای نمایش */
  label: string;
  status: StepStatus;
  /** خلاصه‌ی یک‌خطی از کاری که انجام شد */
  summary: string;
  /** خروجی کامل گام (JSON) برای بررسی دانشجو */
  output: unknown;
  startedAt: string;
  finishedAt: string | null;
};

export type RunStatus = "running" | "done" | "error";

/**
 * نوع اجرا. هر نوع، ارکستریتور خودش را دارد (فازهای بعدی: کمپین چندکاناله).
 * عمداً در دیتابیس فقط text است و check constraint ندارد، چون با هر نوع
 * جدید باید constraint را drop/recreate می‌کردیم.
 */
export type RunKind = "blog" | "repurpose" | "instagram" | "reels";

export type PipelineRun = {
  id: string;
  kind: RunKind;
  status: RunStatus;
  /** موضوع پیشنهادی کاربر (اختیاری — اگر خالی باشد ایده‌یاب آزاد است) */
  topicHint: string | null;
  steps: StepRecord[];
  /** خروجی اجرای بلاگ — تکی */
  postId: string | null;
  /** ورودی اجرای بازآفرینی — پست بلاگ مبدأ */
  sourcePostId: string | null;
  /** خروجی اجرای بازآفرینی — چند خروجی دارد، برای همین آرایه است */
  socialPostIds: string[];
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

/* ── محتوای شبکه‌های اجتماعی ────────────────────────────── */

export type SocialPlatform = "instagram" | "linkedin";
/** ریلز هم پلتفرمش instagram است؛ همین فیلد فرقشان را می‌گوید */
export type SocialFormat = "carousel" | "post" | "reels";
export type SocialStatus = "draft" | "approved";

/**
 * فیلدهای مخصوص هر قالب که ستون ثابت ندارند.
 * ریلز: متن روی تصویر، کپشن جدا از اسکریپت، و دلیل انتخاب CTA.
 */
export type SocialExtras = {
  /** متن کوتاهی که روی فریم قلاب نوشته می‌شود */
  onScreenText?: string;
  /** کپشن پیشنهادی — در ریلز جدا از خودِ اسکریپت است */
  caption?: string;
  /** چرا این CTA انتخاب شد (یک جمله، بیرون از اسکریپت) */
  ctaReason?: string;
};

/** یک اسلاید کاروسل — فقط برای اینستاگرام */
export type Slide = {
  /** خط کوچک بالای اسلاید، مثل «قدم دوم» */
  kicker: string;
  /** تیتر درشت — کوتاه، چون باید در اندازه‌ی بندانگشتی خوانده شود */
  heading: string;
  /** یکی دو جمله توضیح */
  text: string;
};

export type SocialCheckRecord = { name: string; pass: boolean; note: string };

/**
 * یک قطعه محتوای اجتماعی.
 *
 * چرا جدول و تایپ جدا از Post؟ چون posts.slug یکتا و اجباری است (کپشن
 * اسلاگ ندارد) و metaTitle/faq برای یک کپشن بی‌معنی‌اند. راه دیگر یعنی
 * nullable کردن نیمی از جدول بلاگ.
 *
 * چرا این تایپ «تخت» است و union تفکیک‌شده نیست؟ چون union هر mapper و هر
 * map() در UI را مجبور به narrow کردن می‌کرد — هزینه‌ی زیاد برای سود کم.
 * انضباطِ شکلِ داده جایی می‌نشیند که ارزان و غیرقابل‌دورزدن است: constraint
 * دیتابیس (social_posts_shape) و اسکیمای zod ایجنت‌ها.
 */
export type SocialPost = {
  id: string;
  runId: string | null;
  sourcePostId: string | null;
  platform: SocialPlatform;
  format: SocialFormat;
  /** عنوان داخلی برای فهرست استودیو — منتشر نمی‌شود */
  title: string;
  /** کپشن اینستاگرام، متن پست لینکدین، یا اسکریپت کامل ریلز */
  body: string;
  /** فقط کاروسل اسلاید دارد — این قرارداد در دیتابیس هم قفل شده */
  slides: Slide[];
  hashtags: string[];
  cta: string;
  /** فیلدهای مخصوص قالب (فعلاً فقط ریلز) */
  extras: SocialExtras;
  /** خروجی چک‌های قطعی (social-checks) برای نمایش در استودیو */
  checks: SocialCheckRecord[];
  score: number | null;
  status: SocialStatus;
  createdAt: string;
  approvedAt: string | null;
};

export type LessonSource = "critic" | "human";

/** «درس» = حافظه‌ی بلندمدت سیستم؛ سوخت خودبهبودی */
export type Lesson = {
  id: string;
  /** درس برای کدام ایجنت است */
  agent: string;
  lesson: string;
  source: LessonSource;
  active: boolean;
  createdAt: string;
};

export type Feedback = {
  id: string;
  postId: string;
  rating: "up" | "down";
  comment: string;
  createdAt: string;
};

/** قرارداد لایه‌ی ذخیره‌سازی — هر دو پیاده‌سازی باید دقیقاً همین را ارائه کنند */
export interface BlogStore {
  // پست‌ها
  createPost(post: Post): Promise<void>;
  updatePost(id: string, patch: Partial<Post>): Promise<void>;
  getPost(id: string): Promise<Post | null>;
  getPostBySlug(slug: string): Promise<Post | null>;
  listPosts(opts?: { status?: PostStatus }): Promise<Post[]>;

  // اجراهای پایپ‌لاین
  createRun(run: PipelineRun): Promise<void>;
  updateRun(id: string, patch: Partial<PipelineRun>): Promise<void>;
  getRun(id: string): Promise<PipelineRun | null>;
  listRuns(limit?: number): Promise<PipelineRun[]>;

  // محتوای شبکه‌های اجتماعی
  createSocialPost(post: SocialPost): Promise<void>;
  updateSocialPost(id: string, patch: Partial<SocialPost>): Promise<void>;
  getSocialPost(id: string): Promise<SocialPost | null>;
  listSocialPosts(opts?: {
    sourcePostId?: string;
    platform?: SocialPlatform;
  }): Promise<SocialPost[]>;

  // درس‌ها (حافظه‌ی خودبهبودی)
  addLesson(lesson: Lesson): Promise<void>;
  listLessons(opts?: { agent?: string; activeOnly?: boolean }): Promise<Lesson[]>;
  deactivateLesson(id: string): Promise<void>;

  // بازخورد انسانی
  addFeedback(fb: Feedback): Promise<void>;
  listFeedback(postId?: string): Promise<Feedback[]>;
}
