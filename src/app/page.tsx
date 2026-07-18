import Link from "next/link";
import {
  AGENT_ICONS,
  IconArrowLeft,
  IconBook,
  IconBrain,
  IconPlay,
  IconRefresh,
  IconSparkles,
} from "@/components/ui/icons";

const AGENTS: { id: string; num: string; name: string; desc: string }[] = [
  { id: "idea-scout", num: "۱", name: "ایده‌یاب", desc: "چند ایده‌ی مقاله تولید و بر اساس تقاضای جستجو امتیازدهی می‌کند" },
  { id: "strategist", num: "۲", name: "استراتژیست", desc: "بهترین ایده را به بریف محتوا تبدیل می‌کند: مخاطب، کلیدواژه، ساختار" },
  { id: "researcher", num: "۳", name: "پژوهشگر", desc: "فکت‌ها و سؤالات رایج را جمع می‌کند؛ در صورت نیاز وب را جستجو می‌کند" },
  { id: "writer", num: "۴", name: "نویسنده", desc: "پیش‌نویس کامل مقاله را با لحن برند می‌نویسد" },
  { id: "editor", num: "۵", name: "ویراستار", desc: "با روبریک پنج‌معیاره امتیاز می‌دهد؛ ضعیف باشد به نویسنده برمی‌گرداند" },
  { id: "seo", num: "۶", name: "متخصص سئو", desc: "متادیتا، اسلاگ و FAQ Schema می‌سازد و چک‌لیست قطعی را می‌سنجد" },
  { id: "publisher", num: "۷", name: "ناشر", desc: "مقاله‌ی تأییدشده را منتشر می‌کند؛ بقیه منتظر تأیید انسان می‌مانند" },
  { id: "critic", num: "۸", name: "منتقد", desc: "از هر اجرا «درس» استخراج می‌کند تا اجرای بعدی بهتر باشد" },
];

/** پایپ‌لاین دوم — بازآفرینی یک مقاله برای شبکه‌های اجتماعی */
const SOCIAL_AGENTS: { id: string; num: string; name: string; desc: string }[] = [
  { id: "repurposer", num: "۱", name: "بازآفرین محتوا", desc: "از دل مقاله یک پیام مرکزی بیرون می‌کشد که در فید زنده می‌ماند" },
  { id: "instagram-writer", num: "۲", name: "کپی‌رایتر اینستاگرام", desc: "کاروسل ۵ تا ۸ اسلایدی و کپشن با قلاب ۱۲۵ کاراکتری می‌نویسد" },
  { id: "linkedin-writer", num: "۳", name: "کپی‌رایتر لینکدین", desc: "همان پیام را به پست لینکدین با قلاب سه‌خطی تبدیل می‌کند" },
  { id: "social-editor", num: "۴", name: "ویراستار اجتماعی", desc: "با روبریک مخصوص هر پلتفرم امتیاز می‌دهد؛ چک‌های قطعی هم بازنویسی را اجباری می‌کنند" },
];

const HIGHLIGHTS = [
  {
    icon: IconPlay,
    title: "از ایده تا انتشار، خودکار",
    desc: "یک کلیک (یا کرون هفتگی) و کل چرخه‌ی تحریریه اجرا می‌شود: ایده، بریف، پژوهش، نگارش، ویرایش، سئو و انتشار.",
  },
  {
    icon: IconSparkles,
    title: "دروازه‌ی کیفیت واقعی",
    desc: "ویراستارِ مستقل هر پیش‌نویس را امتیاز می‌دهد؛ زیر حد نصاب، مقاله منتشر نمی‌شود و برای بازنویسی برمی‌گردد.",
  },
  {
    icon: IconRefresh,
    title: "هر هفته بهتر از قبل",
    desc: "منتقد از هر اجرا و از بازخورد شما درس می‌گیرد و این درس‌ها به حافظه‌ی ایجنت‌ها تزریق می‌شود.",
  },
];

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 320px at 85% -10%, rgba(20,58,50,0.10), transparent), radial-gradient(600px 280px at 10% 110%, rgba(20,58,50,0.06), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-bold text-brand-700">
            <IconBrain className="h-4 w-4" />
            فاز ۳ — سیستم مولتی‌ایجنت
          </span>

          <h1 className="mx-auto max-w-3xl text-display text-ink max-sm:text-3xl max-sm:font-black">
            یک تحریریه‌ی کامل،
            <span className="text-brand-600"> در قالب تیمی از ایجنت‌های هوشمند</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-ink-muted">
            از پیدا کردن ایده تا نگارش، سئو و انتشار — و بعد بازآفرینی همان مقاله برای
            اینستاگرام و لینکدین. مهم‌تر از همه: سیستمی که از هر اجرا و هر بازخورد،
            برای اجرای بعدی درس می‌گیرد.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/studio"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white shadow-raised transition-all hover:-translate-y-0.5 hover:bg-brand-700"
            >
              <IconPlay className="h-4 w-4" />
              شروع در استودیو
            </Link>
            <Link
              href="/blog"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-surface-line bg-surface px-6 py-3 font-bold text-ink shadow-card transition-all hover:border-brand-300 hover:text-brand-700"
            >
              <IconBook className="h-4 w-4" />
              دیدن بلاگ
            </Link>
          </div>
        </div>
      </section>

      {/* ── ارزش‌ها ──────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <div
              key={h.title}
              className="rounded-xl2 border border-surface-line bg-surface p-6 shadow-card transition-shadow hover:shadow-raised"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <h.icon className="h-5 w-5" />
              </div>
              <h2 className="mb-2 text-title text-ink">{h.title}</h2>
              <p className="text-sm leading-7 text-ink-muted">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── خط تولید بلاگ (۸ ایجنت) ──────────────────────── */}
      <section className="border-y border-surface-line bg-surface py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-headline text-ink">خط تولید بلاگ</h2>
            <p className="mt-2 text-ink-muted">
              هر ایجنت یک تخصص، یک پرامپت و یک قرارداد خروجی مشخص دارد — مثل یک تیم واقعی.
            </p>
          </div>

          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map((agent) => {
              const Icon = AGENT_ICONS[agent.id];
              return (
                <li
                  key={agent.id}
                  className="group relative rounded-xl2 border border-surface-line bg-surface-dim p-5 transition-all hover:border-brand-300 hover:bg-surface hover:shadow-raised"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-brand-600 shadow-card transition-colors group-hover:bg-brand-600 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-2xl font-black text-surface-line transition-colors group-hover:text-brand-200">
                      {agent.num}
                    </span>
                  </div>
                  <h3 className="mb-1 font-bold text-ink">{agent.name}</h3>
                  <p className="text-sm leading-6 text-ink-muted">{agent.desc}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── خط تولید بازآفرینی (پایپ‌لاین دوم) ─────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-headline text-ink">بازآفرینی برای شبکه‌های اجتماعی</h2>
          <p className="mx-auto mt-2 max-w-2xl leading-8 text-ink-muted">
            پایپ‌لاین دوم: یک مقاله‌ی منتشرشده را می‌گیرد و از آن کاروسل اینستاگرام و
            پست لینکدین می‌سازد. یک پیام، چند لباس.
          </p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOCIAL_AGENTS.map((agent) => {
            const Icon = AGENT_ICONS[agent.id];
            return (
              <li
                key={agent.id}
                className="group relative rounded-xl2 border border-surface-line bg-surface-dim p-5 transition-all hover:border-brand-300 hover:bg-surface hover:shadow-raised"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-brand-600 shadow-card transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    {Icon && <Icon className="h-5 w-5" />}
                  </span>
                  <span className="text-2xl font-black text-surface-line transition-colors group-hover:text-brand-200">
                    {agent.num}
                  </span>
                </div>
                <h3 className="mb-1 font-bold text-ink">{agent.name}</h3>
                <p className="text-sm leading-6 text-ink-muted">{agent.desc}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── CTA پایانی ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 rounded-xl2 bg-pine px-8 py-10 text-center shadow-overlay sm:flex-row sm:text-right">
          <div>
            <h2 className="text-xl font-extrabold text-white">
              اولین مقاله را همین حالا تولید کنید
            </h2>
            <p className="mt-2 text-sm leading-7 text-bone/75">
              موضوع بدهید یا انتخاب را به ایده‌یاب بسپارید؛ چند دقیقه بعد مقاله‌ی
              سئوشده آماده است.
            </p>
          </div>
          <Link
            href="/studio"
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-ink transition-transform hover:-translate-y-0.5"
          >
            رفتن به استودیو
            <IconArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
