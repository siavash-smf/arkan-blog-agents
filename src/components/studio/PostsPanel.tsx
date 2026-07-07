"use client";

import { useEffect, useState } from "react";
import { studioFetch } from "./api";
import type { Post } from "@/lib/store/types";
import {
  IconCheck,
  IconClipboardCheck,
  IconEye,
  IconFileText,
  IconMessage,
  IconSpinner,
  IconThumbsDown,
  IconThumbsUp,
} from "@/components/ui/icons";

/**
 * پنل «پست‌ها» — دو کار مهم:
 * ۱. human-in-the-loop: انتشار/برگرداندن پست‌ها (پست‌های امتیاز پایین فقط
 *    با تصمیم انسان منتشر می‌شوند)
 * ۲. بازخورد انسانی: 👍/👎 + توضیح → منتقد آن را به «درس» تبدیل می‌کند
 */

export function PostsPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [rating, setRating] = useState<"up" | "down">("up");
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    try {
      const res = await studioFetch("/api/posts");
      if (res.ok) setPosts((await res.json()).posts);
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(post: Post, status: "draft" | "published") {
    await studioFetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function sendFeedback(postId: string) {
    setNotice("");
    setSending(true);
    try {
      const res = await studioFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ postId, rating, comment }),
      });
      const data = await res.json();
      setNotice(
        data.lessonsAdded > 0
          ? `بازخورد ثبت شد و ${data.lessonsAdded} درس به حافظه‌ی سیستم اضافه شد.`
          : "بازخورد ثبت شد."
      );
      setFeedbackFor(null);
      setComment("");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    // اسکلتون به‌جای اسپینر بلوکه‌کننده
    return (
      <div className="space-y-4" aria-busy="true" aria-label="در حال بارگذاری پست‌ها">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-xl2 border border-surface-line bg-surface p-6">
            <div className="mb-3 h-4 w-24 rounded-full bg-surface-dim" />
            <div className="mb-2 h-5 w-2/3 rounded bg-surface-dim" />
            <div className="h-4 w-full rounded bg-surface-dim" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success"
        >
          <IconCheck className="h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      {posts.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-surface-line bg-surface px-6 py-16 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <IconFileText className="h-7 w-7" />
          </span>
          <p className="font-bold text-ink">هنوز پستی تولید نشده</p>
          <p className="text-sm text-ink-muted">از تب «خط تولید» اولین اجرا را شروع کنید.</p>
        </div>
      )}

      {posts.map((post) => (
        <article
          key={post.id}
          className="animate-fade-up rounded-xl2 border border-surface-line bg-surface p-6 shadow-card"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                post.status === "published"
                  ? "bg-success-soft text-success"
                  : "bg-warn-soft text-warn"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${post.status === "published" ? "bg-success" : "bg-warn"}`}
              />
              {post.status === "published" ? "منتشرشده" : "پیش‌نویس"}
            </span>
            {post.score != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-dim px-3 py-1 text-xs font-medium text-ink-muted">
                <IconClipboardCheck className="h-3.5 w-3.5" />
                امتیاز ویراستار: {post.score.toLocaleString("fa-IR")}/۱۰۰
              </span>
            )}
            <time className="mr-auto text-xs text-ink-muted">
              {new Date(post.createdAt).toLocaleDateString("fa-IR")}
            </time>
          </div>

          <h3 className="mb-1.5 font-extrabold leading-8 text-ink">{post.title}</h3>
          <p className="mb-4 text-sm leading-7 text-ink-muted">{post.excerpt}</p>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {post.status === "published" ? (
              <>
                <a
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-line px-3.5 py-2 font-medium text-ink transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  <IconEye className="h-4 w-4" />
                  مشاهده
                </a>
                <button
                  onClick={() => setStatus(post, "draft")}
                  className="cursor-pointer rounded-lg border border-warn/30 px-3.5 py-2 font-medium text-warn transition-colors hover:bg-warn-soft"
                >
                  بازگرداندن به پیش‌نویس
                </button>
              </>
            ) : (
              <button
                onClick={() => setStatus(post, "published")}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-success px-4 py-2 font-bold text-white transition-opacity hover:opacity-90"
              >
                <IconCheck className="h-4 w-4" />
                انتشار
              </button>
            )}
            <button
              onClick={() => setFeedbackFor(feedbackFor === post.id ? null : post.id)}
              aria-expanded={feedbackFor === post.id}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-line px-3.5 py-2 font-medium text-ink transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <IconMessage className="h-4 w-4" />
              بازخورد
            </button>
          </div>

          {feedbackFor === post.id && (
            <form
              className="mt-4 animate-fade-up rounded-xl bg-surface-dim p-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!sending) sendFeedback(post.id);
              }}
            >
              <fieldset className="mb-4">
                <legend className="mb-2 text-sm font-bold text-ink">نظر کلی</legend>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRating("up")}
                    aria-pressed={rating === "up"}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                      rating === "up"
                        ? "bg-success text-white"
                        : "bg-surface text-ink-muted hover:text-ink"
                    }`}
                  >
                    <IconThumbsUp className="h-4 w-4" />
                    خوب بود
                  </button>
                  <button
                    type="button"
                    onClick={() => setRating("down")}
                    aria-pressed={rating === "down"}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                      rating === "down"
                        ? "bg-danger text-white"
                        : "bg-surface text-ink-muted hover:text-ink"
                    }`}
                  >
                    <IconThumbsDown className="h-4 w-4" />
                    ضعیف بود
                  </button>
                </div>
              </fieldset>

              <label htmlFor={`comment-${post.id}`} className="mb-1.5 block text-sm font-bold text-ink">
                توضیح (اختیاری)
              </label>
              <textarea
                id={`comment-${post.id}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="چه چیزی خوب یا بد بود؟"
                className="mb-1.5 w-full rounded-xl border border-surface-line bg-surface px-4 py-2.5 text-sm transition-colors focus:border-brand-400"
                rows={3}
              />
              <p className="mb-3 text-xs text-ink-muted">
                هرچه مشخص‌تر بنویسید، درسِ بهتری برای سیستم استخراج می‌شود.
              </p>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending && <IconSpinner className="h-4 w-4" />}
                ثبت بازخورد
              </button>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
