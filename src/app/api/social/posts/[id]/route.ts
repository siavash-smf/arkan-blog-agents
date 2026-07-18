import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * PATCH /api/social/posts/[id] — تأیید/بازگرداندن به پیش‌نویس.
 *
 * توجه: «approved» یعنی «انسان این محتوا را برای انتشار دستی تأیید کرد».
 * هیچ فراخوانی شبکه‌ای به اینستاگرام یا لینکدین انجام نمی‌شود — انتشار
 * خودکار نیازمند حساب بیزنسی و تأیید پارتنر است و عمداً خارج از دامنه‌ی
 * این پروژه‌ی آموزشی مانده. خروجی را از استودیو کپی کنید.
 */

export const dynamic = "force-dynamic";

const BodySchema = z.object({ status: z.enum(["draft", "approved"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "بدنه‌ی درخواست نامعتبر است." }, { status: 400 });
  }

  const store = getStore();
  const post = await store.getSocialPost(params.id);
  if (!post) return Response.json({ error: "محتوا پیدا نشد." }, { status: 404 });

  await store.updateSocialPost(params.id, {
    status: parsed.data.status,
    approvedAt:
      parsed.data.status === "approved"
        ? post.approvedAt ?? new Date().toISOString()
        : post.approvedAt,
  });

  return Response.json({ ok: true });
}
