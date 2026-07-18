"use client";

import { useEffect, useState } from "react";
import { studioFetch } from "./api";
import type { Lesson } from "@/lib/store/types";
import { AGENT_ICONS, IconBrain, IconMessage, IconTrash } from "@/components/ui/icons";

/**
 * پنل «درس‌ها» — پنجره‌ای به حافظه‌ی خودبهبودی سیستم.
 * انسان می‌تواند درس‌های اشتباه را حذف (غیرفعال) کند؛ نظارت انسانی روی
 * حافظه‌ی خودکار همان‌قدر مهم است که خود مکانیزم یادگیری.
 */

// ⚠️ ایجنتی که اینجا نباشد، شناسه‌ی انگلیسی خامش در رابط فارسی دیده می‌شود.
const AGENT_LABELS: Record<string, string> = {
  "idea-scout": "ایده‌یاب",
  strategist: "استراتژیست",
  researcher: "پژوهشگر",
  writer: "نویسنده",
  editor: "ویراستار",
  seo: "متخصص سئو",
  // فاز ۴ — محتوای شبکه‌های اجتماعی
  repurposer: "بازآفرین محتوا",
  "social-idea-scout": "ایده‌یاب اجتماعی",
  "instagram-strategist": "استراتژیست اینستاگرام",
  "instagram-writer": "کپی‌رایتر اینستاگرام",
  "linkedin-writer": "کپی‌رایتر لینکدین",
  "reels-writer": "کپی‌رایتر ریلز",
  "social-editor": "ویراستار اجتماعی",
};

export function LessonsPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await studioFetch("/api/lessons");
      if (res.ok) setLessons((await res.json()).lessons);
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

  async function remove(id: string) {
    await studioFetch(`/api/lessons?id=${id}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="در حال بارگذاری درس‌ها">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl2 border border-surface-line bg-surface" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl2 border border-brand-100 bg-brand-50 p-5 text-sm leading-7 text-ink-soft">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-600 shadow-card">
          <IconBrain className="h-5 w-5" />
        </span>
        <p>
          این‌ها درس‌هایی است که سیستم از اجراهای قبلی و بازخوردهای شما گرفته و در
          اجراهای بعدی به پرامپت ایجنت مربوطه تزریق می‌شود. درسِ اشتباه را حذف کنید
          تا حافظه‌ی سیستم سالم بماند.
        </p>
      </div>

      {lessons.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-surface-line bg-surface px-6 py-16 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <IconBrain className="h-7 w-7" />
          </span>
          <p className="font-bold text-ink">هنوز درسی ثبت نشده</p>
          <p className="text-sm text-ink-muted">
            بعد از اولین اجرای کامل، منتقد به‌صورت خودکار درس استخراج می‌کند.
          </p>
        </div>
      )}

      {lessons.map((l) => {
        const AgentIcon = AGENT_ICONS[l.agent];
        return (
          <div
            key={l.id}
            className="flex animate-fade-up items-start gap-4 rounded-xl2 border border-surface-line bg-surface p-5 shadow-card"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-dim text-brand-600">
              {AgentIcon ? <AgentIcon className="h-5 w-5" /> : <IconBrain className="h-5 w-5" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-ink">
                  {AGENT_LABELS[l.agent] ?? l.agent}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-dim px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
                  {l.source === "human" ? (
                    <>
                      <IconMessage className="h-3 w-3" />
                      از بازخورد انسانی
                    </>
                  ) : (
                    <>
                      <IconBrain className="h-3 w-3" />
                      از منتقد
                    </>
                  )}
                </span>
              </div>
              <p className="text-sm leading-7 text-ink-soft">{l.lesson}</p>
            </div>

            <button
              onClick={() => remove(l.id)}
              aria-label="غیرفعال‌کردن این درس"
              title="غیرفعال‌کردن این درس"
              className="cursor-pointer rounded-lg p-2 text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
