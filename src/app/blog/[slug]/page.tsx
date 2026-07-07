import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { getStore } from "@/lib/store";
import { siteUrl } from "@/lib/company";

/**
 * صفحه‌ی مقاله — خروجی نهایی کل پایپ‌لاین.
 * متادیتای سئو و FAQ Schema (JSON-LD) که ایجنت سئو ساخته، اینجا مصرف می‌شود؛
 * یعنی کار ایجنت‌ها مستقیم در <head> صفحه و نتایج گوگل دیده می‌شود.
 */

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getStore().getPostBySlug(params.slug);
  if (!post || post.status !== "published") return {};

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: post.keywords,
    alternates: { canonical: `${siteUrl()}/blog/${post.slug}` },
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      type: "article",
      locale: "fa_IR",
    },
  };
}

export default async function PostPage({ params }: Props) {
  const post = await getStore().getPostBySlug(params.slug);
  if (!post || post.status !== "published") notFound();

  const html = await marked.parse(post.contentMd);

  // FAQ Schema برای نتایج غنی گوگل — ساخته‌ی ایجنت سئو
  const faqJsonLd =
    post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: "آرکان" },
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="mb-6 text-xs text-slate-400">
        <time>
          {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("fa-IR")}
        </time>
      </div>

      <article className="prose-fa" dangerouslySetInnerHTML={{ __html: html }} />

      {post.faq.length > 0 && (
        <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-bold">سؤالات متداول</h2>
          <div className="space-y-4">
            {post.faq.map((f) => (
              <details key={f.question} className="group">
                <summary className="cursor-pointer font-medium text-ink group-open:text-brand-600">
                  {f.question}
                </summary>
                <p className="mt-2 leading-7 text-slate-600">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 rounded-2xl bg-brand-50 p-6 text-center">
        <p className="mb-3 font-bold">
          برای بررسی وضعیت کسب‌وکار شما، گفت‌وگوی اولیه رایگان است.
        </p>
        <a
          href="https://arkan-website-chatbot.vercel.app"
          className="inline-block rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700"
        >
          درخواست مشاوره
        </a>
      </div>
    </main>
  );
}
