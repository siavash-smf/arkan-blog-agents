"use client";

import { useState } from "react";
import type { PipelineRun, StepRecord } from "@/lib/store/types";
import {
  AGENT_ICONS,
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconSpinner,
  IconX,
} from "@/components/ui/icons";

/**
 * تایم‌لاین زنده‌ی یک اجرا — مشترک بین «خط تولید» و «شبکه‌های اجتماعی».
 *
 * کامپوننت کاملاً نمایشی است: هیچ fetch یا polling نمی‌کند و فقط run را
 * می‌گیرد. صاحب polling همان پنلی است که اجرا را شروع کرده.
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

export function RunTimeline({ run, badge }: { run: PipelineRun; badge?: string }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
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
        {badge && (
          <span className="rounded-full bg-surface-dim px-3 py-1 text-xs text-ink-muted">
            {badge}
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
  );
}
