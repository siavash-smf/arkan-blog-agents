import { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * GET /api/campaigns/[id] — وضعیت یک کمپین + وضعیت زنده‌ی هر سه اجرا.
 *
 * اجراها را هم برمی‌گردانیم تا استودیو با یک درخواست، کل تصویر را داشته
 * باشد و مجبور نباشد سه بار جدا poll کند.
 */

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const store = getStore();
  const campaign = await store.getCampaign(params.id);
  if (!campaign) return Response.json({ error: "کمپین پیدا نشد." }, { status: 404 });

  const runs = await Promise.all(
    campaign.runIds.map(async (ref) => ({
      channel: ref.channel,
      run: await store.getRun(ref.runId),
    }))
  );

  return Response.json({ campaign, runs });
}
