"use client";

import type { Slide } from "@/lib/store/types";

/**
 * پیش‌نمایش کاروسل — قاب‌های ۱:۱ با HTML/CSS، بدون تولید تصویر با AI.
 *
 * نکته‌ی آموزشی: کاری که اینجا لازم است «چیدمان قطعی با هویت برند» است، نه
 * خلاقیت تصویری. CSS این را رایگان، فوری و کاملاً یکدست انجام می‌دهد —
 * همان اصلِ «کار قطعی را به مدل نسپار» که در seo-checks و social-checks هم دیدیم.
 *
 * رنگ‌ها فقط از توکن‌های برند می‌آیند (pine/bone/brass)، نه hex خام.
 */
export function CarouselPreview({ slides }: { slides: Slide[] }) {
  if (slides.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
      role="list"
      aria-label="پیش‌نمایش اسلایدهای کاروسل"
    >
      {slides.map((s, i) => (
        <figure
          key={i}
          role="listitem"
          className="relative flex aspect-square w-60 shrink-0 snap-center flex-col justify-between rounded-xl2 bg-pine p-6 text-bone shadow-raised sm:w-64"
        >
          <span className="font-sans text-xs font-medium text-brass">{s.kicker}</span>

          <h4 className="font-heading text-lg font-bold leading-snug">{s.heading}</h4>

          <p className="font-sans text-sm leading-6 text-bone/80">{s.text}</p>

          <span className="absolute bottom-4 left-5 font-sans text-xs text-bone/50">
            {(i + 1).toLocaleString("fa-IR")}/{slides.length.toLocaleString("fa-IR")}
          </span>

          {/* نوار برنجی روی اسلاید قلاب، برای اینکه اسلاید اول در نگاه اول پیدا باشد */}
          {i === 0 && <span className="absolute right-0 top-6 h-8 w-1 rounded-l bg-brass" />}
        </figure>
      ))}
    </div>
  );
}
