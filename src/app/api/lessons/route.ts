import { NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * GET  /api/lessons — مشاهده‌ی حافظه‌ی خودبهبودی
 * DELETE /api/lessons?id=... — غیرفعال‌کردن درس اشتباه (نظارت انسانی روی حافظه)
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();
  const lessons = await getStore().listLessons({ activeOnly: true });
  return Response.json({ lessons });
}

export async function DELETE(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();
  const id = z.string().safeParse(req.nextUrl.searchParams.get("id"));
  if (!id.success || !id.data) {
    return Response.json({ error: "شناسه‌ی درس لازم است." }, { status: 400 });
  }
  await getStore().deactivateLesson(id.data);
  return Response.json({ ok: true });
}
