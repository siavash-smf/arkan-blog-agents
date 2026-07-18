"use client";

import { useEffect, useRef, useState } from "react";
import { studioFetch } from "./api";
import { RunTimeline } from "./RunTimeline";
import { CarouselPreview } from "./CarouselPreview";
import type { PipelineRun, Post, SocialPost } from "@/lib/store/types";
import {
  IconAlert,
  IconCheck,
  IconCopy,
  IconInstagram,
  IconLinkedin,
  IconMessage,
  IconRecycle,
  IconSpinner,
  IconThumbsDown,
  IconThumbsUp,
  IconVideo,
  IconX,
} from "@/components/ui/icons";

/**
 * پنل «شبکه‌های اجتماعی» — سه پایپ‌لاین:
 *
 * ۱. بازآفرینی: از یک مقاله‌ی منتشرشده، کاروسل اینستاگرام + پست لینکدین
 * ۲. کاروسل مستقل: از صفر، بدون مقاله‌ی مبدأ
 * ۳. اسکریپت ریلز: از یک لینک یا متن، متن آماده‌ی بلندخوانی و ضبط
 *
 * قرارداد اجرا در هر سه دقیقاً همان «خط تولید» است: کلاینت runId می‌سازد،
 * polling را شروع می‌کند، بعد POST می‌زند. مسیر polling هم مشترک است، چون
 * همه‌ی انواع اجرا در یک جدول زندگی می‌کنند.
 */

type Mode = "repurpose" | "instagram" | "linkedin" | "reels";

/** برچسب فارسی نوع اجرا، برای نشان روی تایم‌لاین */
const RUN_KIND_LABEL: Record<string, string> = {
  repurpose: "بازآفرینی",
  instagram: "کاروسل مستقل",
  linkedin: "پست لینکدین",
  reels: "اسکریپت ریلز",
};

export function SocialPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [mode, setMode] = useState<Mode>("repurpose");
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [topicHint, setTopicHint] = useState("");
  // ریلز: یا لینک یا متن — نه هر دو
  const [reelsInput, setReelsInput] = useState("");
  const [leadMagnet, setLeadMagnet] = useState("");
  // لینکدین: «مشاهده‌ی این هفته» — ماده‌ی خام ترجیحی این کانال
  const [observation, setObservation] = useState("");
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const [postsRes, socialRes] = await Promise.all([
        studioFetch("/api/posts"),
        studioFetch("/api/social/posts"),
      ]);
      if (postsRes.ok) {
        const all: Post[] = (await postsRes.json()).posts;
        setPosts(all.filter((p) => p.status === "published"));
      }
      if (socialRes.ok) setSocialPosts((await socialRes.json()).socialPosts);
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    if (mode === "repurpose" && !selected) return;
    if (mode === "reels" && !reelsInput.trim()) return;
    setError("");
    setNotice("");
    setBusy(true);
    const runId = crypto.randomUUID();

    // تنها تفاوت حالت‌ها: مسیر و بدنه. بقیه‌ی جریان (polling، خطا، بارگذاری
    // مجدد) یکی است، چون هر سه یک قرارداد اجرا دارند.
    const ENDPOINTS: Record<Mode, string> = {
      repurpose: "/api/social/repurpose",
      instagram: "/api/social/instagram",
      linkedin: "/api/social/linkedin",
      reels: "/api/social/reels",
    };
    const endpoint = ENDPOINTS[mode];

    // تشخیص لینک از متن همین‌جا انجام می‌شود تا کاربر مجبور نباشد خودش
    // بگوید کدام است.
    const trimmed = reelsInput.trim();
    const isUrl = /^https?:\/\/\S+$/i.test(trimmed);

    const body =
      mode === "repurpose"
        ? { runId, sourcePostId: selected }
        : mode === "instagram"
          ? { runId, topicHint: topicHint || undefined }
          : mode === "linkedin"
            ? { runId, observation: observation.trim() || undefined }
            : {
              runId,
              ...(isUrl ? { sourceUrl: trimmed } : { sourceText: trimmed }),
              leadMagnet: leadMagnet.trim() || undefined,
            };

    // شروع polling قبل از POST — تا از اولین گام جا نمانیم
    pollRef.current = setInterval(async () => {
      try {
        const res = await studioFetch(`/api/pipeline/runs/${runId}`);
        if (res.ok) {
          const data = await res.json();
          setRun(data.run);
          if (data.run.status !== "running" && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setBusy(false);
            load();
          }
        }
      } catch {
        /* اجرای بعدی poll دوباره تلاش می‌کند */
      }
    }, 2000);

    try {
      const res = await studioFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطای ناشناخته");
      setRun(data.run);
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") {
        onUnauthorized();
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setBusy(false);
      load();
    }
  }

  async function setStatus(post: SocialPost, status: "draft" | "approved") {
    await studioFetch(`/api/social/posts/${post.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} در کلیپ‌بورد کپی شد.`);
    } catch {
      setNotice("کپی ناموفق بود — متن را دستی انتخاب کنید.");
    }
  }

  return (
    <div className="space-y-6">
      {/* ── انتخاب حالت و شروع اجرا ── */}
      <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
        <h2 className="text-title text-ink">تولید محتوای شبکه‌های اجتماعی</h2>
        <p className="mb-5 mt-1 text-sm leading-6 text-ink-muted">
          {mode === "repurpose"
            ? "یک مقاله‌ی منتشرشده را انتخاب کنید تا از آن یک کاروسل اینستاگرام و یک پست لینکدین ساخته شود. یک پیام، چند لباس."
            : mode === "instagram"
              ? "بدون مقاله‌ی مبدأ، یک کاروسل اینستاگرام از صفر ساخته می‌شود. موضوع دادن اختیاری است — اگر خالی بگذارید، ایده‌یاب خودش انتخاب می‌کند."
              : mode === "linkedin"
                ? "«مشاهده‌ی این هفته» را بنویسید — الگویی که در جلسه‌ها دیده‌اید یا اشتباهی که تکرار می‌شود. پست لینکدین از تجربه‌ی دست‌اول جان می‌گیرد، نه از موضوع کلی."
                : "یک لینک خبر/مقاله یا متن اولیه‌ی خودتان را بدهید تا اسکریپت ریلز ساخته شود — آماده‌ی بلندخوانی و ضبط."}
        </p>

        {/* سوئیچ حالت */}
        <div
          role="tablist"
          className="mb-5 flex rounded-xl border border-surface-line bg-surface-dim p-1"
        >
          {(
            [
              { id: "repurpose", label: "بازآفرینی از مقاله", icon: IconRecycle },
              { id: "instagram", label: "کاروسل مستقل", icon: IconInstagram },
              { id: "linkedin", label: "پست لینکدین", icon: IconLinkedin },
              { id: "reels", label: "اسکریپت ریلز", icon: IconVideo },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              disabled={busy}
              onClick={() => setMode(m.id)}
              className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed ${
                mode === m.id
                  ? "bg-surface text-ink shadow-card"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <m.icon className="h-4 w-4" />
              {m.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-ink-muted">در حال بارگذاری…</p>
        ) : mode === "repurpose" && posts.length === 0 ? (
          <p className="rounded-xl bg-surface-dim px-4 py-3 text-sm leading-6 text-ink-muted">
            هنوز پست منتشرشده‌ای ندارید. اول از تب «خط تولید» یک مقاله بسازید و در تب
            «پست‌ها» منتشرش کنید — یا از حالت «کاروسل مستقل» استفاده کنید که به مقاله
            نیازی ندارد.
          </p>
        ) : mode === "linkedin" ? (
          /* ── لینکدین: مشاهده‌ی این هفته ── */
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) start();
            }}
          >
            <div>
              <label htmlFor="observation" className="mb-1.5 block text-sm font-bold text-ink">
                مشاهده‌ی این هفته <span className="font-normal text-ink-muted">(اختیاری)</span>
              </label>
              <textarea
                id="observation"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                disabled={busy}
                rows={4}
                placeholder="مثلاً: سه کلاینت پشت سر هم فکر می‌کردند مشکلشان بازاریابی است، ولی وقتی نگاه کردیم مشکل قیمت‌گذاری بود."
                className="w-full resize-y rounded-xl border border-surface-line bg-surface-dim px-4 py-3 leading-7 transition-colors placeholder:text-ink-muted/60 focus:border-brand-400 focus:bg-surface"
              />
              <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                اگر خالی بگذارید، ایده‌یاب جایش را پر می‌کند — ولی خروجی عمومی‌تر و
                کم‌اثرتر خواهد بود. نام مشتری ننویسید؛ ایجنت هم موظف است بی‌نامش کند.
              </p>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3 font-bold text-white shadow-card transition-all hover:bg-brand-700 hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {busy ? (
                <>
                  <IconSpinner className="h-4 w-4" />
                  در حال اجرا…
                </>
              ) : (
                <>
                  <IconLinkedin className="h-4 w-4" />
                  ساخت پست لینکدین
                </>
              )}
            </button>
          </form>
        ) : mode === "reels" ? (
          /* ── ریلز: ورودی لینک یا متن + منبع رایگان اختیاری ── */
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) start();
            }}
          >
            <div>
              <label htmlFor="reels-input" className="mb-1.5 block text-sm font-bold text-ink">
                لینک یا متن اولیه
              </label>
              <textarea
                id="reels-input"
                value={reelsInput}
                onChange={(e) => setReelsInput(e.target.value)}
                disabled={busy}
                rows={5}
                placeholder={"یک لینک بگذارید، مثلاً:\nhttps://example.com/article\n\nیا متن/ایده‌ی خودتان را همین‌جا بنویسید."}
                className="w-full resize-y rounded-xl border border-surface-line bg-surface-dim px-4 py-3 leading-7 transition-colors placeholder:text-ink-muted/60 focus:border-brand-400 focus:bg-surface"
              />
              <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                اگر خط اول یک آدرس http باشد، به‌عنوان لینک خوانده می‌شود؛ وگرنه متن ورودی
                در نظر گرفته می‌شود.
              </p>
            </div>

            <div>
              <label htmlFor="lead-magnet" className="mb-1.5 block text-sm font-bold text-ink">
                منبع رایگان <span className="font-normal text-ink-muted">(اختیاری)</span>
              </label>
              <input
                id="lead-magnet"
                value={leadMagnet}
                onChange={(e) => setLeadMagnet(e.target.value)}
                disabled={busy}
                placeholder="مثلاً: چک‌لیست ۷ مرحله‌ای قیمت‌گذاری"
                className="w-full rounded-xl border border-surface-line bg-surface-dim px-4 py-3 transition-colors placeholder:text-ink-muted/60 focus:border-brand-400 focus:bg-surface"
              />
              <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                فقط اگر پرش کنید، دعوت به اقدامِ «کامنت کلمه‌ی کلیدی» مجاز می‌شود.
              </p>
            </div>

            <button
              type="submit"
              disabled={busy || !reelsInput.trim()}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3 font-bold text-white shadow-card transition-all hover:bg-brand-700 hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {busy ? (
                <>
                  <IconSpinner className="h-4 w-4" />
                  در حال اجرا…
                </>
              ) : (
                <>
                  <IconVideo className="h-4 w-4" />
                  ساخت اسکریپت
                </>
              )}
            </button>
          </form>
        ) : (
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) start();
            }}
          >
            <div className="flex-1">
              {mode === "repurpose" ? (
                <>
                  <label htmlFor="source-post" className="sr-only">
                    مقاله‌ی مبدأ
                  </label>
                  <select
                    id="source-post"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    disabled={busy}
                    className="w-full cursor-pointer rounded-xl border border-surface-line bg-surface-dim px-4 py-3 transition-colors focus:border-brand-400 focus:bg-surface"
                  >
                    <option value="">— مقاله‌ی مبدأ را انتخاب کنید —</option>
                    {posts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label htmlFor="social-topic" className="sr-only">
                    موضوع پیشنهادی (اختیاری)
                  </label>
                  <input
                    id="social-topic"
                    value={topicHint}
                    onChange={(e) => setTopicHint(e.target.value)}
                    placeholder="مثلاً: اشتباه‌های استخدام در کسب‌وکارهای کوچک"
                    disabled={busy}
                    className="w-full rounded-xl border border-surface-line bg-surface-dim px-4 py-3 transition-colors placeholder:text-ink-muted/60 focus:border-brand-400 focus:bg-surface"
                  />
                </>
              )}
            </div>
            <button
              type="submit"
              disabled={busy || (mode === "repurpose" && !selected)}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3 font-bold text-white shadow-card transition-all hover:bg-brand-700 hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <IconSpinner className="h-4 w-4" />
                  در حال اجرا…
                </>
              ) : mode === "repurpose" ? (
                <>
                  <IconRecycle className="h-4 w-4" />
                  بازآفرینی
                </>
              ) : (
                <>
                  <IconInstagram className="h-4 w-4" />
                  ساخت کاروسل
                </>
              )}
            </button>
          </form>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
          >
            <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </section>

      {/* ── تایم‌لاین زنده ── */}
      {run && (
        <RunTimeline
          run={run}
          badge={RUN_KIND_LABEL[run.kind] ?? run.kind}
        />
      )}

      {notice && (
        <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success" role="status">
          {notice}
        </p>
      )}

      {/* ── خروجی‌ها ── */}
      {socialPosts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-title text-ink">محتوای تولیدشده</h2>
          {socialPosts.map((sp) => (
            <SocialPostCard
              key={sp.id}
              post={sp}
              onCopy={copy}
              onSetStatus={setStatus}
              onNotice={setNotice}
              onUnauthorized={onUnauthorized}
            />
          ))}
        </section>
      )}
    </div>
  );
}

/* ── کارت یک محتوای اجتماعی ─────────────────────────────── */

function SocialPostCard({
  post,
  onCopy,
  onSetStatus,
  onNotice,
  onUnauthorized,
}: {
  post: SocialPost;
  onCopy: (text: string, label: string) => void;
  onSetStatus: (post: SocialPost, status: "draft" | "approved") => void;
  onNotice: (msg: string) => void;
  onUnauthorized: () => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState<"up" | "down">("up");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  async function sendFeedback() {
    setSending(true);
    try {
      const res = await studioFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          targetType: "social",
          targetId: post.id,
          rating,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطای ناشناخته");
      onNotice(
        data.lessonsAdded > 0
          ? `بازخورد ثبت شد و ${data.lessonsAdded} درس به حافظه‌ی سیستم اضافه شد.`
          : "بازخورد ثبت شد."
      );
      setShowFeedback(false);
      setComment("");
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
      else onNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  const isReels = post.format === "reels";
  const isCarousel = post.format === "carousel";
  const PlatformIcon = isReels
    ? IconVideo
    : post.platform === "instagram"
      ? IconInstagram
      : IconLinkedin;
  const platformLabel = isReels
    ? "اسکریپت ریلز"
    : isCarousel
      ? "کاروسل اینستاگرام"
      : "پست لینکدین";

  // چیزی که واقعاً کپی می‌شود. در ریلز، اسکریپت و کپشن دو چیز جدا هستند:
  // اسکریپت را می‌خوانید، کپشن را زیر ویدیو می‌گذارید.
  const copyText = isReels
    ? post.body
    : `${post.body}\n\n${post.hashtags.join(" ")}`;
  const copyLabel = isReels ? "اسکریپت" : platformLabel;
  const passed = post.checks.filter((c) => c.pass).length;

  return (
    <article className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 font-bold text-ink">
          <PlatformIcon className="h-5 w-5 text-ink-muted" />
          {post.title}
          <span className="rounded-full bg-surface-dim px-2.5 py-0.5 text-xs font-medium text-ink-muted">
            {platformLabel}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {post.score != null && (
            <span className="text-xs text-ink-muted">امتیاز {post.score}/۱۰۰</span>
          )}
          <button
            onClick={() => onSetStatus(post, post.status === "approved" ? "draft" : "approved")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              post.status === "approved"
                ? "bg-success-soft text-success"
                : "bg-surface-dim text-ink-muted hover:bg-brand-50 hover:text-brand-600"
            }`}
          >
            {post.status === "approved" ? "تأییدشده" : "تأیید برای انتشار"}
          </button>
        </div>
      </header>

      {isCarousel && <CarouselPreview slides={post.slides} />}

      {/* در ریلز، دلیل انتخاب CTA بیرون از اسکریپت نمایش داده می‌شود */}
      {isReels && post.extras.ctaReason && (
        <p className="mb-4 rounded-xl border-r-2 border-brass bg-surface-dim px-4 py-3 text-sm leading-6 text-ink-muted">
          <b className="font-bold text-ink">چرا این دعوت به اقدام؟</b> {post.extras.ctaReason}
        </p>
      )}

      {/* متن اصلی — شکست خط‌ها معنادارند، پس whitespace-pre-line */}
      <div className="mt-4">
        {isReels && (
          <h4 className="mb-1.5 text-sm font-bold text-ink">اسکریپت (برای بلندخوانی)</h4>
        )}
        <div className="whitespace-pre-line rounded-xl bg-surface-dim p-4 text-sm leading-8 text-ink-soft">
          {post.body}
        </div>
      </div>

      {/* اکسترا — فقط ریلز: متن روی تصویر و کپشن جدا */}
      {isReels && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {post.extras.onScreenText && (
            <div>
              <h4 className="mb-1.5 text-sm font-bold text-ink">متن روی تصویر (قلاب)</h4>
              <p className="rounded-xl bg-pine px-4 py-3 text-center font-heading text-base font-bold leading-7 text-bone">
                {post.extras.onScreenText}
              </p>
            </div>
          )}
          {post.extras.caption && (
            <div>
              <h4 className="mb-1.5 text-sm font-bold text-ink">کپشن پیشنهادی</h4>
              <p className="whitespace-pre-line rounded-xl bg-surface-dim px-4 py-3 text-sm leading-7 text-ink-soft">
                {post.extras.caption}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {post.hashtags.map((h) => (
          <span key={h} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-600">
            {h}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => onCopy(copyText, copyLabel)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-surface-line px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface-dim"
        >
          <IconCopy className="h-4 w-4" />
          {isReels ? "کپی اسکریپت" : "کپی متن و هشتگ‌ها"}
        </button>
        {isReels && post.extras.caption && (
          <button
            onClick={() =>
              onCopy(`${post.extras.caption}\n\n${post.hashtags.join(" ")}`, "کپشن")
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-surface-line px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface-dim"
          >
            <IconCopy className="h-4 w-4" />
            کپی کپشن و هشتگ‌ها
          </button>
        )}
        <button
          onClick={() => setShowFeedback((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-surface-line px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-surface-dim"
        >
          <IconMessage className="h-4 w-4" />
          بازخورد
        </button>
        <span className="text-xs text-ink-muted">
          چک‌لیست: {passed}/{post.checks.length} پاس
        </span>
      </div>

      {/* بازخورد انسانی → منتقد → درس برای اجراهای بعدی */}
      {showFeedback && (
        <div className="mt-4 rounded-xl border border-surface-line bg-surface-dim p-4">
          <div className="mb-3 flex gap-2">
            {(
              [
                { v: "up", label: "خوب بود", Icon: IconThumbsUp },
                { v: "down", label: "خوب نبود", Icon: IconThumbsDown },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                onClick={() => setRating(o.v)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                  rating === o.v
                    ? o.v === "up"
                      ? "bg-success-soft text-success"
                      : "bg-danger-soft text-danger"
                    : "text-ink-muted hover:bg-surface"
                }`}
              >
                <o.Icon className="h-4 w-4" />
                {o.label}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="چه چیزی را باید دفعه‌ی بعد متفاوت انجام دهد؟ (اختیاری، ولی بدون آن درسی استخراج نمی‌شود)"
            className="w-full resize-y rounded-xl border border-surface-line bg-surface px-3 py-2 text-sm leading-6 transition-colors placeholder:text-ink-muted/60 focus:border-brand-400"
          />
          <button
            onClick={sendFeedback}
            disabled={sending}
            className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {sending ? <IconSpinner className="h-4 w-4" /> : null}
            ثبت بازخورد
          </button>
        </div>
      )}

      {/* چک‌های قطعی — نتیجه‌ی کد، نه قضاوت مدل */}
      {post.checks.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-surface-line pt-4">
          {post.checks.map((c) => (
            <li key={c.name} className="flex items-start gap-2 text-xs leading-5">
              {c.pass ? (
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              ) : (
                <IconX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
              )}
              <span className={c.pass ? "text-ink-muted" : "text-danger"}>
                <b className="font-bold">{c.name}</b> — {c.note}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
