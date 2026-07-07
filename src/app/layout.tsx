import type { Metadata } from "next";
import Link from "next/link";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

/**
 * فونت وزیرمتن — self-hosted با next/font (دانلود در زمان build؛
 * بدون درخواست CDN در زمان اجرا، بدون FOIT، با font-display: swap).
 */
const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800", "900"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "بلاگ آرکان — سیستم مولتی‌ایجنت تولید محتوا",
    template: "%s | بلاگ آرکان",
  },
  description:
    "بلاگ شرکت آرکان — مقالات تولیدشده با پایپ‌لاین مولتی‌ایجنت (فاز ۳ پروژه‌ی آموزشی)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="flex min-h-dvh flex-col font-sans">
        <header className="sticky top-0 z-40 border-b border-surface-line bg-surface/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/"
              className="flex items-baseline gap-2 text-lg font-black tracking-tight text-ink"
            >
              آرکان<span className="text-brand-500">.</span>
              <span className="hidden text-xs font-medium text-ink-muted sm:inline">
                استودیوی محتوای هوشمند
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/blog"
                className="rounded-lg px-3 py-2 font-medium text-ink-muted transition-colors hover:bg-surface-dim hover:text-ink"
              >
                بلاگ
              </Link>
              <Link
                href="/studio"
                className="mr-1 rounded-lg bg-brand-600 px-4 py-2 font-bold text-white shadow-card transition-all hover:bg-brand-700 hover:shadow-raised"
              >
                استودیوی محتوا
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-surface-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:px-6">
            <span>© آرکان — بوتیک مشاوره‌ی استراتژی و رشد کسب‌وکار</span>
            <span>فاز ۳ · سیستم مولتی‌ایجنت تولید محتوا · پروژه‌ی آموزشی</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
