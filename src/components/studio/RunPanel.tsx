"use client";

import { useEffect, useRef, useState } from "react";
import { studioFetch } from "./api";
import type { PipelineRun, StepRecord } from "@/lib/store/types";
import {
  AGENT_ICONS,
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconClock,
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

function StepStatusBadge({ status }: { status: StepRecord["status"] }) {
  if (status === "running")
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-4 ring-brand-100">
        <IconSpinner className="h-4 w-4" />
      </span>
    );
  if (status === "done")
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-success-soft text-success">
        <IconCheck className="h-4 w-4" />
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-danger-soft text-danger">
        <IconX className="h-4 w-4" />
      </span>
    );
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-dim text-ink-muted">
      <IconClock className="h-4 w-4" />
    </span>
  );
}

export function RunPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [topicHint, setTopicHint] = useState("");
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<PipelineRun[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  async function loadHistory() {
    try {
      const res = await studioFetch("/api/pipeline/runs");
      if (res.ok) setHistory((await res.json()).runs);
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
    setExpandedStep(null);
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
        <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-title text-ink">
              {run.status === "running" && (
                <>
                  <span className="inline-block h-2.5 w-2.5 animate-pulse-dot rounded-full bg-brand-500" />
                  در حال اجرا
                </>
              )}
              {run.status === "done" && (
                <>
                  <IconCheck className="h-5 w-5 text-success" />
                  اجرا کامل شد
                </>
              )}
              {run.status === "error" && (
                <>
                  <IconX className="h-5 w-5 text-danger" />
                  اجرا با خطا متوقف شد
                </>
              )}
            </h2>
            {run.topicHint && (
              <span className="rounded-full bg-surface-dim px-3 py-1 text-xs text-ink-muted">
                موضوع: {run.topicHint}
              </span>
            )}
          </div>

          {/* تایم‌لاین عمودی با خط اتصال */}
          <ol className="relative space-y-1 pr-[1.125rem] before:absolute before:bottom-5 before:right-[2.22rem] before:top-5 before:w-px before:bg-surface-line">
            {run.steps.map((s, i) => {
              const AgentIcon = AGENT_ICONS[s.agent];
              const open = expandedStep === i;
              return (
                <li key={i} className="relative animate-fade-up">
                  <button
                    onClick={() => setExpandedStep(open ? null : i)}
                    aria-expanded={open}
                    className="flex w-full cursor-pointer items-center gap-4 rounded-xl px-2 py-3 text-right transition-colors hover:bg-surface-dim"
                  >
                    <span className="relative z-10">
                      <StepStatusBadge status={s.status} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                      <span className="inline-flex shrink-0 items-center gap-2 font-bold text-ink">
                        {AgentIcon && <AgentIcon className="h-4 w-4 text-ink-muted" />}
                        {s.label}
                      </span>
                      <span className="truncate text-xs leading-5 text-ink-muted">{s.summary}</span>
                    </span>
                    {s.output != null && (
                      <IconChevronDown
                        className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {open && s.output != null && (
                    <pre
                      dir="ltr"
                      className="mb-2 mr-14 max-h-80 overflow-auto rounded-xl bg-pine-dark p-4 text-xs leading-5 text-bone/90"
                    >
                      {typeof s.output === "string"
                        ? s.output
                        : JSON.stringify(s.output, null, 2)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ol>

          {run.error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
            >
              <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {run.error}
            </div>
          )}
        </section>
      )}

      {/* ── تاریخچه ── */}
      {history.length > 0 && (
        <section className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-7">
          <h2 className="mb-4 text-title text-ink">اجراهای اخیر</h2>
          <div className="divide-y divide-surface-line">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setRun(h);
                  setExpandedStep(null);
                }}
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
