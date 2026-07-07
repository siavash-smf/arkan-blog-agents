import { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/** GET /api/pipeline/runs/[id] — وضعیت زنده‌ی یک اجرا (کلاینت هر ۲ ثانیه poll می‌کند) */

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isStudioAuthorized(req)) return unauthorized();
  const run = await getStore().getRun(params.id);
  if (!run) return Response.json({ error: "اجرا پیدا نشد." }, { status: 404 });
  return Response.json({ run });
}
