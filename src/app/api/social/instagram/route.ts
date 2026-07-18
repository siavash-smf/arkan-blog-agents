import { NextRequest } from "next/server";
import { z } from "zod";
import { runInstagramPipeline } from "@/lib/agents/instagram-orchestrator";
import { isConfigured } from "@/lib/ai";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * POST /api/social/instagram — ساخت کاروسل مستقل اینستاگرام (بدون مقاله‌ی مبدأ).
 *
 * همان قرارداد بقیه‌ی اجراها: کلاینت runId می‌سازد و با
 * GET /api/pipeline/runs/[id] پیشرفت را poll می‌کند.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  runId: z.string().uuid(),
  topicHint: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();

  if (!isConfigured()) {
    return Response.json(
      { error: "OPENROUTER_API_KEY تنظیم نشده است. فایل .env.local را بسازید." },
      { status: 500 }
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "بدنه‌ی درخواست نامعتبر است." }, { status: 400 });
  }

  const run = await runInstagramPipeline({
    runId: parsed.data.runId,
    topicHint: parsed.data.topicHint ?? null,
  });

  return Response.json({ run });
}
