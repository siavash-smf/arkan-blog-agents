import { NextRequest } from "next/server";
import { z } from "zod";
import { runReelsPipeline } from "@/lib/agents/reels-orchestrator";
import { isConfigured } from "@/lib/ai";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * POST /api/social/reels — ساخت اسکریپت ریلز از یک لینک یا یک متن.
 *
 * همان قرارداد بقیه‌ی اجراها: کلاینت runId می‌سازد و با
 * GET /api/pipeline/runs/[id] پیشرفت را poll می‌کند.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    runId: z.string().uuid(),
    sourceUrl: z.string().url().optional(),
    sourceText: z.string().max(20000).optional(),
    /** منبع رایگان اختیاری — بدون آن، CTAی «کامنت کلمه‌ی کلیدی» مجاز نیست */
    leadMagnet: z.string().max(200).optional(),
  })
  // دقیقاً یکی از دو ورودی. هر دو با هم یعنی کاربر نمی‌داند کدام مبناست.
  .refine((b) => Boolean(b.sourceUrl) !== Boolean(b.sourceText?.trim()), {
    message: "دقیقاً یکی از «لینک» یا «متن» را بدهید.",
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
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "بدنه‌ی درخواست نامعتبر است." },
      { status: 400 }
    );
  }

  const run = await runReelsPipeline({
    runId: parsed.data.runId,
    sourceUrl: parsed.data.sourceUrl ?? null,
    sourceText: parsed.data.sourceText ?? null,
    leadMagnet: parsed.data.leadMagnet ?? null,
  });

  return Response.json({ run });
}
