import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { getStore } from "@/lib/store";
import { siteUrl } from "@/lib/company";
import { IconArrowLeft, IconClock } from "@/components/ui/icons";

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
  const minutes = Math.max(1, Math.round(post.contentMd.split(/\s+/).length / 200));

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
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
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

      <nav className="mb-8 text-sm">
        <Link
          href="/blog"
          className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-ink-muted transition-colors hover:text-brand-600"
        >
          بلاگ
          <IconArrowLeft className="h-3.5 w-3.5 rotate-180" />
        </Link>
      </nav>

      <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-surface-line pb-6 text-sm text-ink-muted">
        <time>
          {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("fa-IR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        <span className="inline-flex items-center gap-1.5">
          <IconClock className="h-4 w-4" />
          {minutes.toLocaleString("fa-IR")} دقیقه مطالعه
        </span>
      </div>

      <article className="prose-fa animate-fade-up" dangerouslySetInnerHTML={{ __html: html }} />

      {post.faq.length > 0 && (
        <section className="mt-14 rounded-xl2 border border-surface-line bg-surface p-6 shadow-card sm:p-8">
          <h2 className="mb-5 text-xl font-extrabold text-ink">سؤالات متداول</h2>
          <div className="divide-y divide-surface-line">
            {post.faq.map((f) => (
              <details key={f.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink transition-colors group-open:text-brand-700 [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <svg
                    className="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <p className="mt-3 leading-8 text-ink-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <aside className="mt-10 rounded-xl2 bg-pine p-8 text-center shadow-overlay">
        <p className="text-lg font-extrabold text-white">
          برای بررسی وضعیت کسب‌وکار شما، گفت‌وگوی اولیه رایگان است.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-bone/75">
          تیم آرکان ظرف ۲۴ ساعت کاری با شما تماس می‌گیرد.
        </p>
        <a
          href="https://arkan-website-chatbot.vercel.app"
          className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-ink transition-transform hover:-translate-y-0.5"
        >
          درخواست مشاوره
          <IconArrowLeft className="h-4 w-4" />
        </a>
      </aside>
    </main>
  );
}
