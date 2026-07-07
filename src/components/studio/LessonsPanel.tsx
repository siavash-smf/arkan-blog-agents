"use client";

import { useEffect, useState } from "react";
import { studioFetch } from "./api";
import type { Lesson } from "@/lib/store/types";

/**
 * پنل «درس‌ها» — پنجره‌ای به حافظه‌ی خودبهبودی سیستم.
 * انسان می‌تواند درس‌های اشتباه را حذف (غیرفعال) کند؛ نظارت انسانی روی
 * حافظه‌ی خودکار همان‌قدر مهم است که خود مکانیزم یادگیری.
 */

const AGENT_LABELS: Record<string, string> = {
  "idea-scout": "ایده‌یاب",
  strategist: "استراتژیست",
  researcher: "پژوهشگر",
  writer: "نویسنده",
  editor: "ویراستار",
  seo: "متخصص سئو",
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

  if (loading) return <p className="text-slate-500">در حال بارگذاری…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5 text-sm leading-7 text-slate-700">
        این‌ها درس‌هایی است که سیستم از اجراهای قبلی و بازخوردهای شما گرفته و در
        اجراهای بعدی به پرامپت ایجنت مربوطه تزریق می‌شود. درسِ اشتباه را حذف کنید
        تا حافظه‌ی سیستم سالم بماند.
      </div>

      {lessons.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          هنوز درسی ثبت نشده — بعد از اولین اجرای کامل، منتقد درس استخراج می‌کند.
        </div>
      )}

      {lessons.map((l) => (
        <div
          key={l.id}
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"
        >
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            {AGENT_LABELS[l.agent] ?? l.agent}
          </span>
          <p className="flex-1 text-sm leading-7">{l.lesson}</p>
          <span className="text-xs text-slate-400">
            {l.source === "human" ? "👤 از بازخورد" : "🤖 از منتقد"}
          </span>
          <button
            onClick={() => remove(l.id)}
            className="text-xs text-red-500 hover:underline"
            title="غیرفعال‌کردن درس"
          >
            حذف
          </button>
        </div>
      ))}
    </div>
  );
}
