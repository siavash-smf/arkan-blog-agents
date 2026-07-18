import type {
  BlogStore,
  Campaign,
  Feedback,
  Lesson,
  PipelineRun,
  Post,
  FeedbackTarget,
  PostStatus,
  SocialPlatform,
  SocialPost,
} from "./types";

/**
 * ذخیره‌سازی در حافظه — برای اجرای محلی بدون Supabase.
 *
 * هشدار: داده‌ها با ری‌استارت سرور پاک می‌شوند و روی Vercel (که هر درخواست
 * ممکن است روی instance جدا اجرا شود) قابل اتکا نیست. فقط برای توسعه و تدریس.
 *
 * نکته‌ی آموزشی: در dev، ماژول‌ها با هر hot-reload دوباره ساخته می‌شوند؛
 * برای همین state را روی globalThis نگه می‌داریم تا بین رفرش‌ها زنده بماند.
 */

type MemoryState = {
  posts: Map<string, Post>;
  campaigns: Map<string, Campaign>;
  socialPosts: Map<string, SocialPost>;
  runs: Map<string, PipelineRun>;
  lessons: Map<string, Lesson>;
  feedback: Feedback[];
};

// نام کلید را با هر تغییرِ شکلِ state عوض می‌کنیم. state() فقط وقتی
// مقداردهی می‌کند که کل شیء غایب باشد؛ پس اگر سرور dev از قبل بالا بوده،
// stateِ جامانده فیلد جدید را ندارد و اولین دسترسی خطا می‌دهد.
const g = globalThis as typeof globalThis & { __arkanBlogMemoryV3?: MemoryState };

function state(): MemoryState {
  if (!g.__arkanBlogMemoryV3) {
    g.__arkanBlogMemoryV3 = {
      posts: new Map(),
      campaigns: new Map(),
      socialPosts: new Map(),
      runs: new Map(),
      lessons: new Map(),
      feedback: [],
    };
  }
  return g.__arkanBlogMemoryV3;
}

export class MemoryStore implements BlogStore {
  async createPost(post: Post) {
    state().posts.set(post.id, post);
  }

  async updatePost(id: string, patch: Partial<Post>) {
    const cur = state().posts.get(id);
    if (cur) state().posts.set(id, { ...cur, ...patch });
  }

  async getPost(id: string) {
    return state().posts.get(id) ?? null;
  }

  async getPostBySlug(slug: string) {
    for (const p of state().posts.values()) if (p.slug === slug) return p;
    return null;
  }

  async listPosts(opts?: { status?: PostStatus }) {
    let all = [...state().posts.values()];
    if (opts?.status) all = all.filter((p) => p.status === opts.status);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createRun(run: PipelineRun) {
    state().runs.set(run.id, run);
  }

  async updateRun(id: string, patch: Partial<PipelineRun>) {
    const cur = state().runs.get(id);
    if (cur) state().runs.set(id, { ...cur, ...patch });
  }

  async getRun(id: string) {
    return state().runs.get(id) ?? null;
  }

  async listRuns(limit = 20) {
    return [...state().runs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async createSocialPost(post: SocialPost) {
    state().socialPosts.set(post.id, post);
  }

  async updateSocialPost(id: string, patch: Partial<SocialPost>) {
    const cur = state().socialPosts.get(id);
    if (cur) state().socialPosts.set(id, { ...cur, ...patch });
  }

  async getSocialPost(id: string) {
    return state().socialPosts.get(id) ?? null;
  }

  async listSocialPosts(opts?: { sourcePostId?: string; platform?: SocialPlatform }) {
    let all = [...state().socialPosts.values()];
    if (opts?.sourcePostId) all = all.filter((p) => p.sourcePostId === opts.sourcePostId);
    if (opts?.platform) all = all.filter((p) => p.platform === opts.platform);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createCampaign(c: Campaign) {
    state().campaigns.set(c.id, c);
  }

  async updateCampaign(id: string, patch: Partial<Campaign>) {
    const cur = state().campaigns.get(id);
    if (cur) state().campaigns.set(id, { ...cur, ...patch });
  }

  async getCampaign(id: string) {
    return state().campaigns.get(id) ?? null;
  }

  async listCampaigns(limit = 20) {
    return [...state().campaigns.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async addLesson(lesson: Lesson) {
    state().lessons.set(lesson.id, lesson);
  }

  async listLessons(opts?: { agent?: string; activeOnly?: boolean }) {
    let all = [...state().lessons.values()];
    if (opts?.agent) all = all.filter((l) => l.agent === opts.agent);
    if (opts?.activeOnly) all = all.filter((l) => l.active);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async deactivateLesson(id: string) {
    const cur = state().lessons.get(id);
    if (cur) state().lessons.set(id, { ...cur, active: false });
  }

  async addFeedback(fb: Feedback) {
    state().feedback.push(fb);
  }

  async listFeedback(opts?: { targetType?: FeedbackTarget; targetId?: string }) {
    let all = state().feedback;
    if (opts?.targetType) all = all.filter((f) => f.targetType === opts.targetType);
    if (opts?.targetId) all = all.filter((f) => f.targetId === opts.targetId);
    return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
