"use client";

import { useEffect, useRef, useState } from "react";
import { studioFetch } from "./api";
import { RunTimeline } from "./RunTimeline";
import type { Campaign, PipelineRun } from "@/lib/store/types";
import {
  IconAlert,
  IconBook,
  IconCheck,
  IconInstagram,
  IconLinkedin,
  IconLayers,
  IconSpinner,
  IconX,
} from "@/components/ui/icons";

/**
 * پنل «کمپین» — لایه‌ی بالای همه‌ی پایپ‌لاین‌ها.
 *
 * یک تم می‌گیرد و سه کانال را هم‌زمان اجرا می‌کند. چون هر کانال رکورد
 * اجرای خودش را دارد، اینجا سه تایم‌لاین جدا نمایش می‌دهیم — و دقیقاً
 * به همین دلیل هم موازی‌کردنشان امن بود.
 */

const CHANNEL_META = {
  blog: { label: "مقاله‌ی بلاگ", Icon: IconBook },
  instagram: { label: "کاروسل اینستاگرام", Icon: IconInstagram },
  linkedin: { label: "پست لینکدین", Icon: IconLinkedin },
} as const;

type ChannelRun = { channel: keyof typeof CHANNEL_META; run: PipelineRun | null };

export function CampaignPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [theme, setTheme] = useState("");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [runs, setRuns] = useState<ChannelRun[]>([]);
  const [history, setHistory] = useState<Campaign[]>([]);
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
    }
  }

  async function start() {
    if (!theme.trim()) return;
    setError("");
    setBusy(true);
    const campaignId = crypto.randomUUID();

    // کمپین سه پایپ‌لاین کامل است و ممکن است درخواست HTTP قبل از پایان
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

  return (
    <div className="space-y-6">
      {/* ── شروع کمپین ── */}
      <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
        <h2 className="text-title text-ink">کمپین چندکاناله</h2>
        <p className="mb-5 mt-1 text-sm leading-6 text-ink-muted">
          یک تم بدهید تا ابتدا «روایت مادر» ساخته شود و بعد هر سه کانال — مقاله،
          کاروسل و پست لینکدین — با زاویه‌ی اختصاصی خودشان و از دل یک حرف مشترک
          تولید شوند.
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
          هر کمپین سه پایپ‌لاین کامل است (حدود ۳۰ تا ۴۰ فراخوانی مدل) و چند دقیقه
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
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["blog", n.blogAngle],
                ["instagram", n.instagramAngle],
                ["linkedin", n.linkedinAngle],
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

      {/* ── سه تایم‌لاین موازی ── */}
      {runs.map(({ channel, run }) => {
        const meta = CHANNEL_META[channel];
        if (!run) {
          return (
            <div
              key={channel}
              className="flex items-center gap-3 rounded-xl2 border border-dashed border-surface-line bg-surface px-6 py-5 text-sm text-ink-muted"
            >
              <IconSpinner className="h-4 w-4" />
              <meta.Icon className="h-4 w-4" />
              {meta.label} — در انتظار شروع…
            </div>
          );
        }
        return <RunTimeline key={channel} run={run} badge={meta.label} />;
      })}

      {/* ── تاریخچه ── */}
      {history.length > 0 && (
        <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
          <h2 className="mb-4 text-title text-ink">کمپین‌های اخیر</h2>
          <div className="divide-y divide-surface-line">
            {history.map((c) => (
              <button
                key={c.id}
                onClick={() => openCampaign(c.id)}
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
