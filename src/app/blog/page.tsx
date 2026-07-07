import Link from "next/link";
import { getStore } from "@/lib/store";

/** بلاگ عمومی — فقط پست‌های منتشرشده */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "بلاگ",
  description: "مقالات آرکان درباره‌ی استراتژی، ساختار، بازار و اجرا",
};

export default async function BlogPage() {
  const posts = await getStore().listPosts({ status: "published" });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-black">بلاگ آرکان</h1>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          هنوز مقاله‌ای منتشر نشده. از{" "}
          <Link href="/studio" className="text-brand-600 underline">
            استودیو
          </Link>{" "}
          اولین اجرای پایپ‌لاین را شروع کنید.
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand-500"
            >
              <Link href={`/blog/${post.slug}`}>
                <h2 className="mb-2 text-xl font-bold hover:text-brand-600">
                  {post.title}
                </h2>
              </Link>
              <p className="mb-3 leading-7 text-slate-600">{post.excerpt}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <time>
                  {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("fa-IR")}
                </time>
                {post.keywords.slice(0, 3).map((k) => (
                  <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5">
                    {k}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
