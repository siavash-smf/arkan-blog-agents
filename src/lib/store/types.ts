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

export type PipelineRun = {
  id: string;
  status: RunStatus;
  /** موضوع پیشنهادی کاربر (اختیاری — اگر خالی باشد ایده‌یاب آزاد است) */
  topicHint: string | null;
  steps: StepRecord[];
  postId: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
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

  // درس‌ها (حافظه‌ی خودبهبودی)
  addLesson(lesson: Lesson): Promise<void>;
  listLessons(opts?: { agent?: string; activeOnly?: boolean }): Promise<Lesson[]>;
  deactivateLesson(id: string): Promise<void>;

  // بازخورد انسانی
  addFeedback(fb: Feedback): Promise<void>;
  listFeedback(postId?: string): Promise<Feedback[]>;
}
