import { NextRequest } from "next/server";
import { z } from "zod";
import { runCampaign } from "@/lib/agents/campaign-orchestrator";
import { getStore } from "@/lib/store";
import { isConfigured } from "@/lib/ai";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * GET  /api/campaigns — فهرست کمپین‌ها
 * POST /api/campaigns — اجرای کمپین چندکاناله
 *
 * مثل بقیه‌ی اجراها کلاینت شناسه را می‌سازد و بعد وضعیت را poll می‌کند —
 * اینجا حتی مهم‌تر است، چون کمپین سه پایپ‌لاین کامل را اجرا می‌کند و
 * احتمال قطع‌شدن درخواست HTTP قبل از پایان زیاد است.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  campaignId: z.string().uuid(),
  theme: z.string().min(4).max(300),
});

export async function GET(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();
  const campaigns = await getStore().listCampaigns();
  return Response.json({ campaigns });
}

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

  const campaign = await runCampaign(parsed.data);
  return Response.json({ campaign });
}
