"use client";

import { useEffect, useState } from "react";
import { studioFetch } from "./api";
import type { Post } from "@/lib/store/types";

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
    const res = await studioFetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ postId, rating, comment }),
    });
    const data = await res.json();
    setNotice(
      data.lessonsAdded > 0
        ? `بازخورد ثبت شد و ${data.lessonsAdded} درس به حافظه‌ی سیستم اضافه شد 🧠`
        : "بازخورد ثبت شد."
    );
    setFeedbackFor(null);
    setComment("");
  }

  if (loading) return <p className="text-slate-500">در حال بارگذاری…</p>;

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          هنوز پستی تولید نشده. از تب «خط تولید» شروع کنید.
        </div>
      )}

      {posts.map((post) => (
        <div key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                post.status === "published"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {post.status === "published" ? "منتشرشده" : "پیش‌نویس"}
            </span>
            {post.score != null && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                امتیاز ویراستار: {post.score}/100
              </span>
            )}
            <span className="mr-auto text-xs text-slate-400">
              {new Date(post.createdAt).toLocaleDateString("fa-IR")}
            </span>
          </div>

          <h3 className="mb-1 font-bold">{post.title}</h3>
          <p className="mb-3 text-sm leading-6 text-slate-500">{post.excerpt}</p>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {post.status === "published" ? (
              <>
                <a
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 hover:border-brand-500"
                >
                  مشاهده ↗
                </a>
                <button
                  onClick={() => setStatus(post, "draft")}
                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-amber-700 hover:bg-amber-50"
                >
                  بازگرداندن به پیش‌نویس
                </button>
              </>
            ) : (
              <button
                onClick={() => setStatus(post, "published")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700"
              >
                انتشار ✓
              </button>
            )}
            <button
              onClick={() => setFeedbackFor(feedbackFor === post.id ? null : post.id)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 hover:border-brand-500"
            >
              💬 بازخورد
            </button>
          </div>

          {feedbackFor === post.id && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <div className="mb-3 flex gap-2">
                <button
                  onClick={() => setRating("up")}
                  className={`rounded-lg px-3 py-1.5 ${rating === "up" ? "bg-emerald-600 text-white" : "bg-white"}`}
                >
                  👍 خوب بود
                </button>
                <button
                  onClick={() => setRating("down")}
                  className={`rounded-lg px-3 py-1.5 ${rating === "down" ? "bg-red-600 text-white" : "bg-white"}`}
                >
                  👎 ضعیف بود
                </button>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="چه چیزی خوب/بد بود؟ هرچه مشخص‌تر بنویسید، درسِ بهتری برای سیستم استخراج می‌شود."
                className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={3}
              />
              <button
                onClick={() => sendFeedback(post.id)}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-700"
              >
                ثبت بازخورد
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
