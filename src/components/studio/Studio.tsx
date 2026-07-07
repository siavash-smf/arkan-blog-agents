"use client";

import { useState } from "react";
import { RunPanel } from "./RunPanel";
import { PostsPanel } from "./PostsPanel";
import { LessonsPanel } from "./LessonsPanel";
import { getStudioPassword, setStudioPassword } from "./api";
import { IconBrain, IconFactory, IconFileText, IconLock } from "@/components/ui/icons";

/**
 * استودیوی محتوا — سه تب:
 * ۱. خط تولید: اجرای پایپ‌لاین و تماشای زنده‌ی کار ایجنت‌ها
 * ۲. پست‌ها: مدیریت انتشار (human-in-the-loop) و ثبت بازخورد
 * ۳. درس‌ها: حافظه‌ی خودبهبودی سیستم
 */

type Tab = "run" | "posts" | "lessons";

const TABS: { id: Tab; label: string; icon: (p: { className?: string }) => JSX.Element }[] = [
  { id: "run", label: "خط تولید", icon: IconFactory },
  { id: "posts", label: "پست‌ها", icon: IconFileText },
  { id: "lessons", label: "درس‌ها", icon: IconBrain },
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
        <form
          className="rounded-xl2 border border-surface-line bg-surface p-7 shadow-raised"
          onSubmit={(e) => {
            e.preventDefault();
            setStudioPassword(passwordInput);
            setNeedsPassword(false);
          }}
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <IconLock className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-extrabold text-ink">ورود به استودیو</h1>
              <p className="text-xs text-ink-muted">این بخش با رمز محافظت می‌شود.</p>
            </div>
          </div>

          <label htmlFor="studio-password" className="mb-1.5 block text-sm font-bold text-ink">
            رمز استودیو
          </label>
          <input
            id="studio-password"
            type="password"
            dir="ltr"
            autoFocus
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="mb-4 w-full rounded-xl border border-surface-line bg-surface-dim px-4 py-2.5 transition-colors focus:border-brand-400 focus:bg-surface"
          />
          <button
            type="submit"
            className="w-full cursor-pointer rounded-xl bg-brand-600 py-2.5 font-bold text-white transition-colors hover:bg-brand-700"
          >
            ورود
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-surface-line bg-surface p-1 shadow-card" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                tab === t.id
                  ? "bg-ink text-white shadow-card"
                  : "text-ink-muted hover:bg-surface-dim hover:text-ink"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
        {getStudioPassword() && (
          <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <IconLock className="h-3.5 w-3.5" />
            رمز ذخیره شده
          </span>
        )}
      </div>

      {tab === "run" && <RunPanel onUnauthorized={onUnauthorized} />}
      {tab === "posts" && <PostsPanel onUnauthorized={onUnauthorized} />}
      {tab === "lessons" && <LessonsPanel onUnauthorized={onUnauthorized} />}
    </main>
  );
}
