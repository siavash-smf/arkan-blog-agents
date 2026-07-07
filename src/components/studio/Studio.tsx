"use client";

import { useState } from "react";
import { RunPanel } from "./RunPanel";
import { PostsPanel } from "./PostsPanel";
import { LessonsPanel } from "./LessonsPanel";
import { getStudioPassword, setStudioPassword } from "./api";

/**
 * استودیوی محتوا — سه تب:
 * ۱. خط تولید: اجرای پایپ‌لاین و تماشای زنده‌ی کار ایجنت‌ها
 * ۲. پست‌ها: مدیریت انتشار (human-in-the-loop) و ثبت بازخورد
 * ۳. درس‌ها: حافظه‌ی خودبهبودی سیستم
 */

type Tab = "run" | "posts" | "lessons";

const TABS: { id: Tab; label: string }[] = [
  { id: "run", label: "🏭 خط تولید" },
  { id: "posts", label: "📄 پست‌ها" },
  { id: "lessons", label: "🧠 درس‌ها" },
];

export function Studio() {
  const [tab, setTab] = useState<Tab>("run");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // هر پنل با این callback اعلام می‌کند که سرور 401 داده است
  const onUnauthorized = () => setNeedsPassword(true);

  if (needsPassword) {
    return (
      <main className="mx-auto max-w-sm px-4 py-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="mb-4 text-lg font-bold">ورود به استودیو</h1>
          <input
            type="password"
            dir="ltr"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="رمز استودیو"
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            onClick={() => {
              setStudioPassword(passwordInput);
              setNeedsPassword(false);
            }}
            className="w-full rounded-lg bg-brand-600 py-2 font-bold text-white hover:bg-brand-700"
          >
            ورود
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === t.id
                ? "bg-ink text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
        {getStudioPassword() && (
          <span className="mr-auto text-xs text-slate-400">🔐 رمز ذخیره شده</span>
        )}
      </div>

      {tab === "run" && <RunPanel onUnauthorized={onUnauthorized} />}
      {tab === "posts" && <PostsPanel onUnauthorized={onUnauthorized} />}
      {tab === "lessons" && <LessonsPanel onUnauthorized={onUnauthorized} />}
    </main>
  );
}
