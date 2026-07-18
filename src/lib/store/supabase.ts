import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  BlogStore,
  Feedback,
  Lesson,
  PipelineRun,
  Post,
  PostStatus,
  SocialPlatform,
  SocialPost,
} from "./types";

/**
 * ذخیره‌سازی Supabase — برای پروداکشن.
 * اسکیمای جدول‌ها در supabase/schema.sql است.
 *
 * ستون‌ها snake_case هستند و تایپ‌های ما camelCase؛ توابع toRow/fromRow
 * این تبدیل را یک‌جا انجام می‌دهند تا بقیه‌ی کد تمیز بماند.
 */

function client(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      // مهم: fetch سوپابیس را no-store می‌کنیم تا کش داده‌ی Next عکس لحظه‌ای
      // قدیمی را نگه ندارد؛ وگرنه پست‌های جدید در استودیو دیده نمی‌شوند.
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}

/* ── تبدیل ردیف ↔ تایپ ─────────────────────────────────── */

function postToRow(p: Post) {
  return {
    id: p.id,
    run_id: p.runId,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content_md: p.contentMd,
    meta_title: p.metaTitle,
    meta_description: p.metaDescription,
    keywords: p.keywords,
    faq: p.faq,
    score: p.score,
    status: p.status,
    created_at: p.createdAt,
    published_at: p.publishedAt,
  };
}

function postFromRow(r: any): Post {
  return {
    id: r.id,
    runId: r.run_id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    contentMd: r.content_md,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    keywords: r.keywords ?? [],
    faq: r.faq ?? [],
    score: r.score,
    status: r.status,
    createdAt: r.created_at,
    publishedAt: r.published_at,
  };
}

function runToRow(r: PipelineRun) {
  return {
    id: r.id,
    kind: r.kind,
    status: r.status,
    topic_hint: r.topicHint,
    steps: r.steps,
    post_id: r.postId,
    source_post_id: r.sourcePostId,
    social_post_ids: r.socialPostIds,
    error: r.error,
    created_at: r.createdAt,
    finished_at: r.finishedAt,
  };
}

function runFromRow(r: any): PipelineRun {
  return {
    id: r.id,
    // مقدار پیش‌فرض برای رکوردهای ساخته‌شده پیش از افزودن این سه ستون؛
    // بدون آن، undefined به کلاینت می‌رسد و رندر تاریخچه می‌شکند.
    kind: r.kind ?? "blog",
    status: r.status,
    topicHint: r.topic_hint,
    steps: r.steps ?? [],
    postId: r.post_id,
    sourcePostId: r.source_post_id ?? null,
    socialPostIds: r.social_post_ids ?? [],
    error: r.error,
    createdAt: r.created_at,
    finishedAt: r.finished_at,
  };
}

function socialPostToRow(p: SocialPost) {
  return {
    id: p.id,
    run_id: p.runId,
    source_post_id: p.sourcePostId,
    platform: p.platform,
    format: p.format,
    title: p.title,
    body: p.body,
    slides: p.slides,
    hashtags: p.hashtags,
    cta: p.cta,
    checks: p.checks,
    extras: p.extras,
    score: p.score,
    status: p.status,
    created_at: p.createdAt,
    approved_at: p.approvedAt,
  };
}

function socialPostFromRow(r: any): SocialPost {
  return {
    id: r.id,
    runId: r.run_id,
    sourcePostId: r.source_post_id,
    platform: r.platform,
    format: r.format,
    title: r.title,
    body: r.body,
    slides: r.slides ?? [],
    hashtags: r.hashtags ?? [],
    cta: r.cta ?? "",
    checks: r.checks ?? [],
    // رکوردهای ساخته‌شده پیش از افزودن این ستون
    extras: r.extras ?? {},
    score: r.score,
    status: r.status,
    createdAt: r.created_at,
    approvedAt: r.approved_at,
  };
}

function lessonFromRow(r: any): Lesson {
  return {
    id: r.id,
    agent: r.agent,
    lesson: r.lesson,
    source: r.source,
    active: r.active,
    createdAt: r.created_at,
  };
}

/** پارشیال camelCase → پارشیال snake_case (فقط کلیدهای موجود) */
function partialToRow<T>(patch: Partial<T>, mapper: (full: T) => Record<string, unknown>): Record<string, unknown> {
  const fullRow = mapper(patch as T);
  const camelKeys = Object.keys(patch as Record<string, unknown>);
  const out: Record<string, unknown> = {};
  for (const [snake, value] of Object.entries(fullRow)) {
    const camel = snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (camelKeys.includes(camel)) out[snake] = value;
  }
  return out;
}

export class SupabaseStore implements BlogStore {
  async createPost(post: Post) {
    const { error } = await client().from("posts").insert(postToRow(post));
    if (error) throw new Error(`ثبت پست ناموفق بود: ${error.message}`);
  }

  async updatePost(id: string, patch: Partial<Post>) {
    const row = partialToRow(patch, postToRow as any);
    const { error } = await client().from("posts").update(row).eq("id", id);
    if (error) throw new Error(`به‌روزرسانی پست ناموفق بود: ${error.message}`);
  }

  async getPost(id: string) {
    const { data } = await client().from("posts").select("*").eq("id", id).maybeSingle();
    return data ? postFromRow(data) : null;
  }

  async getPostBySlug(slug: string) {
    const { data } = await client().from("posts").select("*").eq("slug", slug).maybeSingle();
    return data ? postFromRow(data) : null;
  }

  async listPosts(opts?: { status?: PostStatus }) {
    let q = client().from("posts").select("*").order("created_at", { ascending: false });
    if (opts?.status) q = q.eq("status", opts.status);
    const { data, error } = await q;
    if (error) throw new Error(`خواندن پست‌ها ناموفق بود: ${error.message}`);
    return (data ?? []).map(postFromRow);
  }

  async createRun(run: PipelineRun) {
    const { error } = await client().from("pipeline_runs").insert(runToRow(run));
    if (error) throw new Error(`ثبت اجرا ناموفق بود: ${error.message}`);
  }

  async updateRun(id: string, patch: Partial<PipelineRun>) {
    const row = partialToRow(patch, runToRow as any);
    const { error } = await client().from("pipeline_runs").update(row).eq("id", id);
    if (error) throw new Error(`به‌روزرسانی اجرا ناموفق بود: ${error.message}`);
  }

  async getRun(id: string) {
    const { data } = await client().from("pipeline_runs").select("*").eq("id", id).maybeSingle();
    return data ? runFromRow(data) : null;
  }

  async listRuns(limit = 20) {
    const { data } = await client()
      .from("pipeline_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map(runFromRow);
  }

  async createSocialPost(post: SocialPost) {
    const { error } = await client().from("social_posts").insert(socialPostToRow(post));
    if (error) throw new Error(`ثبت محتوای اجتماعی ناموفق بود: ${error.message}`);
  }

  async updateSocialPost(id: string, patch: Partial<SocialPost>) {
    const row = partialToRow(patch, socialPostToRow as any);
    const { error } = await client().from("social_posts").update(row).eq("id", id);
    if (error) throw new Error(`به‌روزرسانی محتوای اجتماعی ناموفق بود: ${error.message}`);
  }

  async getSocialPost(id: string) {
    const { data } = await client().from("social_posts").select("*").eq("id", id).maybeSingle();
    return data ? socialPostFromRow(data) : null;
  }

  async listSocialPosts(opts?: { sourcePostId?: string; platform?: SocialPlatform }) {
    let q = client().from("social_posts").select("*").order("created_at", { ascending: false });
    if (opts?.sourcePostId) q = q.eq("source_post_id", opts.sourcePostId);
    if (opts?.platform) q = q.eq("platform", opts.platform);
    const { data, error } = await q;
    if (error) throw new Error(`خواندن محتوای اجتماعی ناموفق بود: ${error.message}`);
    return (data ?? []).map(socialPostFromRow);
  }

  async addLesson(lesson: Lesson) {
    const { error } = await client().from("lessons").insert({
      id: lesson.id,
      agent: lesson.agent,
      lesson: lesson.lesson,
      source: lesson.source,
      active: lesson.active,
      created_at: lesson.createdAt,
    });
    if (error) throw new Error(`ثبت درس ناموفق بود: ${error.message}`);
  }

  async listLessons(opts?: { agent?: string; activeOnly?: boolean }) {
    let q = client().from("lessons").select("*").order("created_at", { ascending: false });
    if (opts?.agent) q = q.eq("agent", opts.agent);
    if (opts?.activeOnly) q = q.eq("active", true);
    const { data } = await q;
    return (data ?? []).map(lessonFromRow);
  }

  async deactivateLesson(id: string) {
    await client().from("lessons").update({ active: false }).eq("id", id);
  }

  async addFeedback(fb: Feedback) {
    const { error } = await client().from("post_feedback").insert({
      id: fb.id,
      post_id: fb.postId,
      rating: fb.rating,
      comment: fb.comment,
      created_at: fb.createdAt,
    });
    if (error) throw new Error(`ثبت بازخورد ناموفق بود: ${error.message}`);
  }

  async listFeedback(postId?: string) {
    let q = client().from("post_feedback").select("*").order("created_at", { ascending: false });
    if (postId) q = q.eq("post_id", postId);
    const { data } = await q;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      postId: r.post_id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    }));
  }
}
