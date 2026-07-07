import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { distillFeedback } from "@/lib/agents/critic";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * POST /api/feedback — ثبت بازخورد انسانی روی یک پست.
 * بازخورد هم خام ذخیره می‌شود، هم بلافاصله به منتقد داده می‌شود تا اگر
 * درس عمومی در آن هست، وارد حافظه‌ی خودبهبودی شود.
 */

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  postId: z.string(),
  rating: z.enum(["up", "down"]),
  comment: z.string().max(2000).default(""),
});

export async function POST(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "بدنه‌ی درخواست نامعتبر است." }, { status: 400 });
  }

  const store = getStore();
  const post = await store.getPost(parsed.data.postId);
  if (!post) return Response.json({ error: "پست پیدا نشد." }, { status: 404 });

  await store.addFeedback({
    id: randomUUID(),
    postId: post.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    createdAt: new Date().toISOString(),
  });

  // استخراج درس — اگر مدل در دسترس نبود، ثبت بازخورد خام کافی است
  let lessonsAdded = 0;
  try {
    lessonsAdded = await distillFeedback({
      post,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
  } catch {
    /* بازخورد ذخیره شده؛ درس‌گیری بعداً هم ممکن است */
  }

  return Response.json({ ok: true, lessonsAdded });
}
