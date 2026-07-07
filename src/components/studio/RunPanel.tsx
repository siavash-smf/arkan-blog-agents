"use client";

import { useEffect, useRef, useState } from "react";
import { studioFetch } from "./api";
import type { PipelineRun, StepRecord } from "@/lib/store/types";

/**
 * پنل «خط تولید» — نقطه‌ی شروع پایپ‌لاین و نمایش زنده‌ی گام‌ها.
 *
 * الگوی هماهنگی: کلاینت runId می‌سازد → POST (که تا پایان باز می‌ماند) →
 * همزمان هر ۲ ثانیه GET وضعیت. چون ارکستریتور هر گام را در store آینه
 * می‌کند، همین polling ساده یک نمای زنده می‌سازد — بدون WebSocket.
 */

const STATUS_ICON: Record<StepRecord["status"], string> = {
  running: "⏳",
  done: "✅",
  error: "❌",
  skipped: "⏭️",
};

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
      {/* فرم شروع */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-1 font-bold">اجرای جدید پایپ‌لاین</h2>
        <p className="mb-4 text-sm text-slate-500">
          موضوع دادن اختیاری است — اگر خالی بگذارید، ایده‌یاب خودش موضوع پیدا می‌کند.
        </p>
        <div className="flex gap-3">
          <input
            value={topicHint}
            onChange={(e) => setTopicHint(e.target.value)}
            placeholder="مثلاً: قیمت‌گذاری خدمات برای کسب‌وکارهای کوچک"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5"
            disabled={busy}
          />
          <button
            onClick={start}
            disabled={busy}
            className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "در حال اجرا…" : "شروع 🚀"}
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* نمای زنده‌ی گام‌ها */}
      {run && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">
              {run.status === "running" && "🏃 در حال اجرا"}
              {run.status === "done" && "🎉 اجرا کامل شد"}
              {run.status === "error" && "💥 اجرا با خطا متوقف شد"}
            </h2>
            {run.topicHint && (
              <span className="text-xs text-slate-400">موضوع: {run.topicHint}</span>
            )}
          </div>

          <ol className="space-y-2">
            {run.steps.map((s, i) => (
              <li key={i} className="rounded-xl border border-slate-100 bg-slate-50">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-right"
                  onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                >
                  <span>{STATUS_ICON[s.status]}</span>
                  <span className="font-medium">{s.label}</span>
                  <span className="mr-auto truncate text-xs text-slate-500">
                    {s.summary}
                  </span>
                </button>
                {expandedStep === i && s.output != null && (
                  <pre
                    dir="ltr"
                    className="max-h-80 overflow-auto border-t border-slate-200 bg-ink p-4 text-xs leading-5 text-green-300"
                  >
                    {typeof s.output === "string"
                      ? s.output
                      : JSON.stringify(s.output, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ol>

          {run.error && (
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {run.error}
            </div>
          )}
        </div>
      )}

      {/* تاریخچه */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 font-bold">اجراهای اخیر</h2>
          <div className="space-y-2 text-sm">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => setRun(h)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-right hover:bg-slate-50"
              >
                <span>
                  {h.status === "done" ? "✅" : h.status === "error" ? "❌" : "⏳"}
                </span>
                <span className="text-slate-600">
                  {h.topicHint || "بدون موضوع (انتخاب آزاد ایده‌یاب)"}
                </span>
                <span className="mr-auto text-xs text-slate-400">
                  {new Date(h.createdAt).toLocaleString("fa-IR")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
