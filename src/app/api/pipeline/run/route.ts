import { NextRequest } from "next/server";
import { z } from "zod";
import { runPipeline } from "@/lib/agents/orchestrator";
import { isConfigured } from "@/lib/ai";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * POST /api/pipeline/run — اجرای کامل پایپ‌لاین.
 *
 * الگوی هماهنگی با کلاینت: کلاینت خودش runId (UUID) می‌سازد و می‌فرستد،
 * بعد بلافاصله با GET /api/pipeline/runs/[id] پیشرفت را poll می‌کند.
 * این درخواست تا پایان پایپ‌لاین باز می‌ماند (چند دقیقه)؛ برای همین
 * maxDuration را بالا برده‌ایم.
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

  const run = await runPipeline({
    runId: parsed.data.runId,
    topicHint: parsed.data.topicHint ?? null,
  });

  return Response.json({ run });
}
