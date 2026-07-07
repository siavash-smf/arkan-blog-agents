import Link from "next/link";

const AGENTS = [
  ["۱", "ایده‌یاب", "چند ایده‌ی مقاله تولید و امتیازدهی می‌کند"],
  ["۲", "استراتژیست", "بهترین ایده را به بریف محتوا تبدیل می‌کند"],
  ["۳", "پژوهشگر", "فکت‌ها و سؤالات رایج را جمع می‌کند (+ جستجوی وب)"],
  ["۴", "نویسنده", "پیش‌نویس کامل مقاله را می‌نویسد"],
  ["۵", "ویراستار", "با روبریک امتیاز می‌دهد؛ ضعیف باشد برمی‌گرداند"],
  ["۶", "متخصص سئو", "متادیتا، اسلاگ، FAQ Schema و چک‌لیست قطعی"],
  ["۷", "ناشر", "مقاله‌ی تأییدشده را منتشر می‌کند"],
  ["۸", "منتقد", "از هر اجرا «درس» استخراج می‌کند — خودبهبودی"],
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-black leading-tight">
          سیستم مولتی‌ایجنت تولید بلاگ‌پست
        </h1>
        <p className="mx-auto max-w-2xl leading-8 text-slate-600">
          از ایده تا انتشار و سئو — ۸ ایجنت تخصصی که مثل یک تحریریه‌ی واقعی با هم
          کار می‌کنند و از هر اجرا برای اجرای بعدی درس می‌گیرند.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/studio"
            className="rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700"
          >
            رفتن به استودیو ←
          </Link>
          <Link
            href="/blog"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-bold text-ink hover:border-brand-500"
          >
            دیدن بلاگ
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AGENTS.map(([num, name, desc]) => (
          <div key={name} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 font-black text-brand-600">
              {num}
            </div>
            <div className="mb-1 font-bold">{name}</div>
            <div className="text-sm leading-6 text-slate-500">{desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
