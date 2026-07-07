import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="fa" dir="rtl">
      <body className="min-h-screen font-sans">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-black text-ink">
              آرکان<span className="text-brand-600">.</span>
              <span className="mr-2 text-sm font-normal text-slate-500">
                فاز ۳ — بلاگ مولتی‌ایجنت
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/blog" className="text-slate-600 hover:text-brand-600">
                بلاگ
              </Link>
              <Link
                href="/studio"
                className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
              >
                استودیوی محتوا
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
