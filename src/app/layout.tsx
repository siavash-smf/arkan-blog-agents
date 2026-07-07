import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";

/**
 * فونت‌های برند آرکان — دقیقاً همان فایل‌های self-hosted سایت اصلی
 * (استعداد برای عناوین، وزیرمتن برای بدنه) تا استودیو و سایت یکدست باشند.
 */
const estedad = localFont({
  src: [
    { path: "../../public/fonts/Estedad-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Estedad-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/Estedad-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/Estedad-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-estedad",
  display: "swap",
  preload: true,
});

const vazirmatn = localFont({
  src: [
    { path: "../../public/fonts/Vazirmatn-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Vazirmatn-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/Vazirmatn-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/Vazirmatn-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "استودیوی محتوای آرکان — سیستم مولتی‌ایجنت",
    template: "%s | استودیوی آرکان",
  },
  description:
    "استودیوی تولید محتوای آرکان — مقالات ساخته‌شده با پایپ‌لاین مولتی‌ایجنت (فاز ۳ پروژه‌ی آموزشی)",
};

/** نشانه‌ی «چهار رکن» آرکان — همان لوگوی سایت */
function BrandMark() {
  return (
    <span className="inline-flex select-none items-center gap-2.5" aria-label="آرکان">
      <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="shrink-0">
        <g strokeLinecap="round">
          <line x1="9" y1="29" x2="9" y2="17" stroke="#143A32" strokeWidth="2.6" />
          <line x1="16" y1="29" x2="16" y2="11" stroke="#143A32" strokeWidth="2.6" />
          <line x1="23" y1="29" x2="23" y2="13" stroke="#B5853A" strokeWidth="2.6" />
          <line x1="30" y1="29" x2="30" y2="19" stroke="#143A32" strokeWidth="2.6" />
        </g>
      </svg>
      <span className="font-heading text-xl font-bold leading-none tracking-tight text-pine">
        آرکان
      </span>
    </span>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${estedad.variable} ${vazirmatn.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <header className="sticky top-0 z-40 border-b border-surface-line bg-bone/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5" aria-label="آرکان — خانه">
              <BrandMark />
              <span className="hidden text-xs font-medium text-ink-muted sm:inline">
                استودیوی محتوای هوشمند
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/blog"
                className="rounded-btn px-3 py-2 font-medium text-ink-muted transition-colors hover:bg-sand hover:text-pine"
              >
                بلاگ
              </Link>
              <Link
                href="/studio"
                className="mr-1 rounded-btn bg-pine px-4 py-2 font-medium text-bone shadow-card transition-colors hover:bg-pine-dark"
              >
                استودیوی محتوا
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-surface-line bg-pine text-bone">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-bone/70 sm:flex-row sm:px-6">
            <span>© آرکان — بوتیک مشاوره‌ی استراتژی و رشد کسب‌وکار</span>
            <span>فاز ۳ · سیستم مولتی‌ایجنت تولید محتوا · پروژه‌ی آموزشی</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
