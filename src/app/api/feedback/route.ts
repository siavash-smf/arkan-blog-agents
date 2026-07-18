import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { distillFeedback } from "@/lib/agents/critic";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * POST /api/feedback — ثبت بازخورد انسانی روی یک پست بلاگ یا محتوای اجتماعی.
 *
 * بازخورد هم خام ذخیره می‌شود، هم بلافاصله به منتقد داده می‌شود تا اگر
 * درس عمومی در آن هست، وارد حافظه‌ی خودبهبودی شود.
 *
 * هدف با «نوع + شناسه» مشخص می‌شود، نه با postId. این تعمیم وقتی انجام شد
 * که سه قالب اجتماعی داشتیم — یک بار، نه یک بار به‌ازای هر قالب.
 */

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  targetType: z.enum(["post", "social"]),
  targetId: z.string(),
  rating: z.enum(["up", "down"]),
  comment: z.string().max(2000).default(""),
});

const FORMAT_LABEL: Record<string, string> = {
  carousel: "کاروسل اینستاگرام",
  post: "پست لینکدین",
  reels: "اسکریپت ریلز",
};

export async function POST(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "بدنه‌ی درخواست نامعتبر است." }, { status: 400 });
  }

  const { targetType, targetId, rating, comment } = parsed.data;
  const store = getStore();

  // محتوای هدف را می‌خوانیم — هم برای اطمینان از وجودش، هم برای دادن
  // زمینه به منتقد.
  let contentKind: string;
  let title: string;
  let content: string;

  if (targetType === "post") {
    const post = await store.getPost(targetId);
    if (!post) return Response.json({ error: "پست پیدا نشد." }, { status: 404 });
    contentKind = "مقاله‌ی بلاگ";
    title = post.title;
    content = post.contentMd;
  } else {
    const sp = await store.getSocialPost(targetId);
    if (!sp) return Response.json({ error: "محتوای اجتماعی پیدا نشد." }, { status: 404 });
    contentKind = FORMAT_LABEL[sp.format] ?? "محتوای اجتماعی";
    title = sp.title;
    // اسلایدها هم بخشی از محتوا هستند و باید در قضاوت دیده شوند
    content =
      sp.slides.length > 0
        ? `${sp.body}\n\nاسلایدها:\n${sp.slides.map((s, i) => `${i + 1}. ${s.heading} — ${s.text}`).join("\n")}`
        : sp.body;
  }

  await store.addFeedback({
    id: randomUUID(),
    targetType,
    targetId,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  });

  // استخراج درس — اگر مدل در دسترس نبود، ثبت بازخورد خام کافی است
  let lessonsAdded = 0;
  try {
    lessonsAdded = await distillFeedback({ contentKind, title, content, rating, comment });
  } catch {
    /* بازخورد ذخیره شده؛ درس‌گیری بعداً هم ممکن است */
  }

  return Response.json({ ok: true, lessonsAdded });
}
