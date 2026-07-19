"use client";

import { useEffect, useRef, useState } from "react";
import { studioFetch } from "./api";
import { RunTimeline } from "./RunTimeline";
import { SocialPostCard } from "./SocialPostCard";
import type { Campaign, PipelineRun, Post, SocialPost } from "@/lib/store/types";
import {
  IconAlert,
  IconBook,
  IconCheck,
  IconEye,
  IconInstagram,
  IconLinkedin,
  IconLayers,
  IconSpinner,
  IconVideo,
  IconX,
} from "@/components/ui/icons";

/**
 * پنل «کمپین» — لایه‌ی بالای همه‌ی پایپ‌لاین‌ها.
 *
 * یک تم می‌گیرد و چهار کانال را هم‌زمان اجرا می‌کند. چون هر کانال رکورد
 * اجرای خودش را دارد، اینجا چهار تایم‌لاین جدا نمایش می‌دهیم — و دقیقاً
 * به همین دلیل هم موازی‌کردنشان امن بود.
 */

const CHANNEL_META = {
  blog: { label: "مقاله‌ی بلاگ", Icon: IconBook },
  instagram: { label: "کاروسل اینستاگرام", Icon: IconInstagram },
  linkedin: { label: "پست لینکدین", Icon: IconLinkedin },
  reels: { label: "اسکریپت ریلز", Icon: IconVideo },
} as const;

type Channel = keyof typeof CHANNEL_META;

/** اجرای یک کانال به‌همراه خروجی‌اش — هر دو از یک درخواست می‌آیند */
type ChannelRun = {
  channel: Channel;
  run: PipelineRun | null;
  post: Post | null;
  socialPosts: SocialPost[];
};

export function CampaignPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [theme, setTheme] = useState("");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [runs, setRuns] = useState<ChannelRun[]>([]);
  const [history, setHistory] = useState<Campaign[]>([]);
  /** کانالی که کاربر رویش کلیک کرده و خروجی‌اش نمایش داده می‌شود */
  const [active, setActive] = useState<Channel | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadHistory() {
    try {
      const res = await studioFetch("/api/campaigns");
      if (res.ok) setHistory((await res.json()).campaigns);
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
    }
  }

  useEffect(() => {
    loadHistory();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openCampaign(id: string) {
    const res = await studioFetch(`/api/campaigns/${id}`);
    if (res.ok) {
      const data = await res.json();
      setCampaign(data.campaign);
      setRuns(data.runs);
      // اولین کانالی که خروجی دارد را باز می‌کنیم تا کاربر با صفحه‌ی
      // خالی روبه‌رو نشود؛ اگر هیچ‌کدام آماده نبود، اولی.
      setActive((cur) => {
        if (cur) return cur;
        const ready = data.runs.find(
          (r: ChannelRun) => r.post || r.socialPosts.length > 0
        );
        return (ready ?? data.runs[0])?.channel ?? null;
      });
    }
  }

  async function setSocialStatus(post: SocialPost, status: "draft" | "approved") {
    await studioFetch(`/api/social/posts/${post.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (campaign) openCampaign(campaign.id);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} در کلیپ‌بورد کپی شد.`);
    } catch {
      setNotice("کپی ناموفق بود — متن را دستی انتخاب کنید.");
    }
  }

  async function start() {
    if (!theme.trim()) return;
    setError("");
    setNotice("");
    setActive(null);
    setBusy(true);
    const campaignId = crypto.randomUUID();

    // کمپین چهار پایپ‌لاین کامل است و ممکن است درخواست HTTP قبل از پایان
    // قطع شود؛ پس تکیه‌ی اصلی روی polling است، نه روی پاسخ POST.
    pollRef.current = setInterval(async () => {
      try {
        const res = await studioFetch(`/api/campaigns/${campaignId}`);
        if (res.ok) {
          const data = await res.json();
          setCampaign(data.campaign);
          setRuns(data.runs);
          if (data.campaign.status !== "running" && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setBusy(false);
            loadHistory();
          }
        }
      } catch {
        /* poll بعدی دوباره تلاش می‌کند */
      }
    }, 2500);

    try {
      const res = await studioFetch("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({ campaignId, theme: theme.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطای ناشناخته");
      setCampaign(data.campaign);
    } catch (e) {
      if (e instanceof Error && e.message === "PASSWORD_REQUIRED") onUnauthorized();
      else setError(e instanceof Error ? e.message : String(e));
    } finally {
      // polling را نمی‌بندیم اگر کمپین هنوز در جریان است — ممکن است
      // درخواست قطع شده باشد ولی اجرا در پس‌زمینه ادامه داشته باشد.
      await openCampaign(campaignId).catch(() => {});
      loadHistory();
    }
  }

  const n = campaign?.narrative;
  const activeRun = runs.find((r) => r.channel === active) ?? null;

  return (
    <div className="space-y-6">
      {/* ── شروع کمپین ── */}
      <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
        <h2 className="text-title text-ink">کمپین چندکاناله</h2>
        <p className="mb-5 mt-1 text-sm leading-6 text-ink-muted">
          یک تم بدهید تا ابتدا «روایت مادر» ساخته شود و بعد هر چهار کانال — مقاله،
          کاروسل، پست لینکدین و اسکریپت ریلز — با زاویه‌ی اختصاصی خودشان و از دل یک
          حرف مشترک تولید شوند.
        </p>

        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) start();
          }}
        >
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            disabled={busy}
            placeholder="مثلاً: چرا کسب‌وکارها با رشد فروش، سودآورتر نمی‌شوند"
            className="flex-1 rounded-xl border border-surface-line bg-surface-dim px-4 py-3 transition-colors placeholder:text-ink-muted/60 focus:border-brand-400 focus:bg-surface"
          />
          <button
            type="submit"
            disabled={busy || !theme.trim()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3 font-bold text-white shadow-card transition-all hover:bg-brand-700 hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <IconSpinner className="h-4 w-4" />
                در حال اجرا…
              </>
            ) : (
              <>
                <IconLayers className="h-4 w-4" />
                اجرای کمپین
              </>
            )}
          </button>
        </form>

        <p className="mt-3 text-xs leading-5 text-ink-muted">
          هر کمپین چهار پایپ‌لاین کامل است (حدود ۴۰ تا ۵۰ فراخوانی مدل) و چند دقیقه
          طول می‌کشد. اگر صفحه را ببندید، اجرا در سرور ادامه می‌یابد و نتیجه‌اش در
          همین فهرست می‌نشیند.
        </p>

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

      {/* ── روایت مادر ── */}
      {n && (
        <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
          <h2 className="mb-4 text-title text-ink">روایت مادر</h2>

          <div className="mb-5 rounded-xl border-r-2 border-brass bg-surface-dim p-4">
            <p className="font-heading text-lg font-bold leading-8 text-ink">{n.bigIdea}</p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="mb-1 text-xs font-bold text-ink-muted">تنش</dt>
              <dd className="text-sm leading-7 text-ink-soft">{n.tension}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-bold text-ink-muted">پاسخ آرکان</dt>
              <dd className="text-sm leading-7 text-ink-soft">{n.resolution}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <p className="mb-2 text-xs font-bold text-ink-muted">ستون‌های محتوایی</p>
            <div className="flex flex-wrap gap-1.5">
              {n.pillars.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-600"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* زاویه‌ی هر کانال — اگر این سه شبیه هم باشند، کمپین شکست خورده */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["blog", n.blogAngle],
                ["instagram", n.instagramAngle],
                ["linkedin", n.linkedinAngle],
                ["reels", n.reelsAngle],
              ] as const
            ).map(([ch, angle]) => {
              const meta = CHANNEL_META[ch];
              return (
                <div key={ch} className="rounded-xl bg-surface-dim p-4">
                  <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    <meta.Icon className="h-3.5 w-3.5 text-ink-muted" />
                    {meta.label}
                  </p>
                  <p className="text-sm leading-7 text-ink-muted">{angle}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── انتخاب کانال: روی هرکدام کلیک کنید تا خروجی‌اش را ببینید ── */}
      {runs.length > 0 && (
        <section className="rounded-xl2 border border-surface-line bg-surface p-3 shadow-card">
          <div role="tablist" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {runs.map(({ channel, run, post, socialPosts }) => {
              const meta = CHANNEL_META[channel];
              const isActive = active === channel;
              const outputCount = (post ? 1 : 0) + socialPosts.length;
              return (
                <button
                  key={channel}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(channel)}
                  className={`flex cursor-pointer flex-col items-start gap-1.5 rounded-xl px-4 py-3 text-right transition-all ${
                    isActive
                      ? "bg-pine text-bone shadow-card"
                      : "bg-surface-dim text-ink hover:bg-surface hover:shadow-card"
                  }`}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-bold">
                    <meta.Icon className="h-4 w-4" />
                    {meta.label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs ${
                      isActive ? "text-bone/70" : "text-ink-muted"
                    }`}
                  >
                    {!run ? (
                      <>
                        <IconSpinner className="h-3 w-3" />
                        در انتظار شروع
                      </>
                    ) : run.status === "running" ? (
                      <>
                        <IconSpinner className="h-3 w-3" />
                        در حال اجرا
                      </>
                    ) : run.status === "error" ? (
                      <>
                        <IconX className="h-3 w-3" />
                        خطا
                      </>
                    ) : (
                      <>
                        <IconCheck className="h-3 w-3" />
                        {outputCount > 0 ? "آماده — کلیک کنید" : "بدون خروجی"}
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── خروجی کانال انتخاب‌شده ── */}
      {activeRun && (
        <>
          {/* بلاگ خروجی متفاوتی دارد، پس رندر مخصوص خودش */}
          {activeRun.post && (
            <article className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
              <header className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    activeRun.post.status === "published"
                      ? "bg-success-soft text-success"
                      : "bg-warn-soft text-warn"
                  }`}
                >
                  {activeRun.post.status === "published" ? "منتشرشده" : "پیش‌نویس"}
                </span>
                {activeRun.post.score != null && (
                  <span className="rounded-full bg-surface-dim px-3 py-1 text-xs text-ink-muted">
                    امتیاز ویراستار: {activeRun.post.score.toLocaleString("fa-IR")}/۱۰۰
                  </span>
                )}
              </header>

              <h3 className="mb-1.5 font-extrabold leading-8 text-ink">
                {activeRun.post.title}
              </h3>
              <p className="mb-4 text-sm leading-7 text-ink-muted">
                {activeRun.post.excerpt}
              </p>

              <div className="max-h-96 overflow-auto whitespace-pre-line rounded-xl bg-surface-dim p-4 text-sm leading-8 text-ink-soft">
                {activeRun.post.contentMd}
              </div>

              {activeRun.post.status === "published" && (
                <a
                  href={`/blog/${activeRun.post.slug}`}
                  target="_blank"
                  className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-line px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  <IconEye className="h-4 w-4" />
                  مشاهده در بلاگ
                </a>
              )}
            </article>
          )}

          {/* کانال‌های اجتماعی — همان کارتی که در تب شبکه‌های اجتماعی است */}
          {activeRun.socialPosts.map((sp) => (
            <SocialPostCard
              key={sp.id}
              post={sp}
              onCopy={copy}
              onSetStatus={setSocialStatus}
              onNotice={setNotice}
              onUnauthorized={onUnauthorized}
            />
          ))}

          {/* اجرای تمام‌شده‌ای که خروجی ندارد یعنی جایی از زنجیره شکسته */}
          {activeRun.run &&
            activeRun.run.status !== "running" &&
            !activeRun.post &&
            activeRun.socialPosts.length === 0 && (
              <p className="rounded-xl2 border border-dashed border-surface-line bg-surface px-6 py-5 text-sm leading-7 text-ink-muted">
                این کانال خروجی ندارد. تایم‌لاین پایین نشان می‌دهد کجا متوقف شده.
              </p>
            )}

          {/* تایم‌لاین همان کانال */}
          {activeRun.run && (
            <RunTimeline run={activeRun.run} badge={CHANNEL_META[active!].label} />
          )}
        </>
      )}

      {notice && (
        <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success" role="status">
          {notice}
        </p>
      )}

      {/* ── تاریخچه ── */}
      {history.length > 0 && (
        <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
          <h2 className="mb-4 text-title text-ink">کمپین‌های اخیر</h2>
          <div className="divide-y divide-surface-line">
            {history.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActive(null);
                  openCampaign(c.id);
                }}
                className="flex w-full cursor-pointer items-center gap-3 px-2 py-3 text-right text-sm transition-colors hover:bg-surface-dim"
              >
                {c.status === "done" ? (
                  <IconCheck className="h-4 w-4 shrink-0 text-success" />
                ) : c.status === "error" ? (
                  <IconX className="h-4 w-4 shrink-0 text-danger" />
                ) : (
                  <IconSpinner className="h-4 w-4 shrink-0 text-brand-500" />
                )}
                <span className="min-w-0 flex-1 truncate text-ink-soft">{c.theme}</span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {c.runIds.filter((r) => r.status === "done").length.toLocaleString("fa-IR")}/
                  {c.runIds.length.toLocaleString("fa-IR")} کانال
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
