import { NextRequest } from "next/server";
import { z } from "zod";
import { runLinkedinPipeline } from "@/lib/agents/linkedin-orchestrator";
import { isConfigured } from "@/lib/ai";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * POST /api/social/linkedin — ساخت پست مستقل لینکدین.
 *
 * ورودی ترجیحی «مشاهده‌ی این هفته» است؛ اگر ندهید، از ایده‌یاب استفاده
 * می‌شود ولی خروجی عمومی‌تر خواهد بود.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  runId: z.string().uuid(),
  observation: z.string().max(4000).optional(),
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

  const run = await runLinkedinPipeline({
    runId: parsed.data.runId,
    observation: parsed.data.observation ?? null,
    topicHint: parsed.data.topicHint ?? null,
  });

  return Response.json({ run });
}
