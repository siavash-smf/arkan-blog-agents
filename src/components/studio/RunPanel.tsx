"use client";

import { useEffect, useRef, useState } from "react";
import { studioFetch } from "./api";
import { RunTimeline } from "./RunTimeline";
import type { PipelineRun } from "@/lib/store/types";
import {
  IconAlert,
  IconCheck,
  IconPlay,
  IconSpinner,
  IconX,
} from "@/components/ui/icons";

/**
 * پنل «خط تولید» — نقطه‌ی شروع پایپ‌لاین و نمایش زنده‌ی گام‌ها.
 *
 * الگوی هماهنگی: کلاینت runId می‌سازد → POST (که تا پایان باز می‌ماند) →
 * همزمان هر ۲ ثانیه GET وضعیت. چون ارکستریتور هر گام را در store آینه
 * می‌کند، همین polling ساده یک نمای زنده می‌سازد — بدون WebSocket.
 */

export function RunPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [topicHint, setTopicHint] = useState("");
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<PipelineRun[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadHistory() {
    try {
      const res = await studioFetch("/api/pipeline/runs");
      if (res.ok) {
        const runs: PipelineRun[] = (await res.json()).runs;
        // اجراهای بازآفرینی تاریخچه‌ی خودشان را در تب «شبکه‌های اجتماعی» دارند
        setHistory(runs.filter((r) => r.kind !== "repurpose"));
      }
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

  async function start() {
    setError("");
    setBusy(true);
    const runId = crypto.randomUUID();

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
            loadHistory();
          }
        }
      } catch {
        /* اجرای بعدی poll دوباره تلاش می‌کند */
      }
    }, 2000);

    try {
      const res = await studioFetch("/api/pipeline/run", {
        method: "POST",
        body: JSON.stringify({ runId, topicHint: topicHint || undefined }),
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
      loadHistory();
    }
  }

  return (
    <div className="space-y-6">
      {/* ── فرم شروع ── */}
      <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
        <h2 className="text-title text-ink">اجرای جدید پایپ‌لاین</h2>
        <p className="mb-5 mt-1 text-sm text-ink-muted">
          موضوع دادن اختیاری است — اگر خالی بگذارید، ایده‌یاب خودش موضوع پیدا می‌کند.
        </p>

        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) start();
          }}
        >
          <div className="flex-1">
            <label htmlFor="topic-hint" className="sr-only">
              موضوع پیشنهادی (اختیاری)
            </label>
            <input
              id="topic-hint"
              value={topicHint}
              onChange={(e) => setTopicHint(e.target.value)}
              placeholder="مثلاً: قیمت‌گذاری خدمات برای کسب‌وکارهای کوچک"
              className="w-full rounded-xl border border-surface-line bg-surface-dim px-4 py-3 transition-colors placeholder:text-ink-muted/60 focus:border-brand-400 focus:bg-surface"
              disabled={busy}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3 font-bold text-white shadow-card transition-all hover:bg-brand-700 hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <IconSpinner className="h-4 w-4" />
                در حال اجرا…
              </>
            ) : (
              <>
                <IconPlay className="h-4 w-4" />
                شروع
              </>
            )}
          </button>
        </form>

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
          badge={run.topicHint ? `موضوع: ${run.topicHint}` : undefined}
        />
      )}

      {/* ── تاریخچه ── */}
      {history.length > 0 && (
        <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
          <h2 className="mb-4 text-title text-ink">اجراهای اخیر</h2>
          <div className="divide-y divide-surface-line">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => setRun(h)}
                className="flex w-full cursor-pointer items-center gap-3 px-2 py-3 text-right text-sm transition-colors hover:bg-surface-dim"
              >
                {h.status === "done" ? (
                  <IconCheck className="h-4 w-4 shrink-0 text-success" />
                ) : h.status === "error" ? (
                  <IconX className="h-4 w-4 shrink-0 text-danger" />
                ) : (
                  <IconSpinner className="h-4 w-4 shrink-0 text-brand-500" />
                )}
                <span className="min-w-0 flex-1 truncate text-ink-soft">
                  {h.topicHint || "بدون موضوع (انتخاب آزاد ایده‌یاب)"}
                </span>
                <time className="shrink-0 text-xs text-ink-muted">
                  {new Date(h.createdAt).toLocaleString("fa-IR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
