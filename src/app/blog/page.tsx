import Link from "next/link";
import { getStore } from "@/lib/store";
import { IconArrowLeft, IconBook, IconClock } from "@/components/ui/icons";

/** بلاگ عمومی — فقط پست‌های منتشرشده */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "بلاگ",
  description: "مقالات آرکان درباره‌ی استراتژی، ساختار، بازار و اجرا",
};

/** تخمین زمان مطالعه — حدود ۲۰۰ کلمه در دقیقه برای فارسی */
function readingMinutes(contentMd: string): number {
  return Math.max(1, Math.round(contentMd.split(/\s+/).length / 200));
}

export default async function BlogPage() {
  const posts = await getStore().listPosts({ status: "published" });

  return (
    <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <h1 className="text-headline text-ink">بلاگ آرکان</h1>
        <p className="mt-2 leading-8 text-ink-muted">
          راهنماهای عملی برای مدیرانی که می‌خواهند کسب‌وکارشان را آگاهانه رشد دهند.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl2 border border-dashed border-surface-line bg-surface px-6 py-16 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <IconBook className="h-7 w-7" />
          </span>
          <div>
            <p className="font-bold text-ink">هنوز مقاله‌ای منتشر نشده</p>
            <p className="mt-1 text-sm text-ink-muted">
              اولین اجرای پایپ‌لاین را از استودیو شروع کنید.
            </p>
          </div>
          <Link
            href="/studio"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            رفتن به استودیو
            <IconArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <article key={post.id} className="animate-fade-up">
              <Link
                href={`/blog/${post.slug}`}
                className="group block cursor-pointer rounded-xl2 border border-surface-line bg-surface p-6 shadow-card transition-all hover:border-brand-300 hover:shadow-raised sm:p-7"
              >
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                  <time>
                    {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("fa-IR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <span className="inline-flex items-center gap-1">
                    <IconClock className="h-3.5 w-3.5" />
                    {readingMinutes(post.contentMd).toLocaleString("fa-IR")} دقیقه مطالعه
                  </span>
                </div>

                <h2 className="mb-2 text-xl font-extrabold leading-9 text-ink transition-colors group-hover:text-brand-700">
                  {post.title}
                </h2>
                <p className="mb-4 leading-8 text-ink-muted">{post.excerpt}</p>

                <div className="flex flex-wrap items-center gap-2">
                  {post.keywords.slice(0, 3).map((k) => (
                    <span
                      key={k}
                      className="rounded-full bg-surface-dim px-3 py-1 text-xs font-medium text-ink-muted"
                    >
                      {k}
                    </span>
                  ))}
                  <span className="mr-auto inline-flex items-center gap-1 text-sm font-bold text-brand-600 transition-transform group-hover:-translate-x-1">
                    ادامه‌ی مطلب
                    <IconArrowLeft className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
