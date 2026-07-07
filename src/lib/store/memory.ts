import type {
  BlogStore,
  Feedback,
  Lesson,
  PipelineRun,
  Post,
  PostStatus,
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
  runs: Map<string, PipelineRun>;
  lessons: Map<string, Lesson>;
  feedback: Feedback[];
};

const g = globalThis as typeof globalThis & { __arkanBlogMemory?: MemoryState };

function state(): MemoryState {
  if (!g.__arkanBlogMemory) {
    g.__arkanBlogMemory = {
      posts: new Map(),
      runs: new Map(),
      lessons: new Map(),
      feedback: [],
    };
  }
  return g.__arkanBlogMemory;
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

  async listFeedback(postId?: string) {
    const all = postId
      ? state().feedback.filter((f) => f.postId === postId)
      : state().feedback;
    return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
