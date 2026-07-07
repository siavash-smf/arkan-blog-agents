import { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/** GET /api/pipeline/runs — فهرست اجراهای اخیر برای تب تاریخچه */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();
  const runs = await getStore().listRuns(20);
  return Response.json({ runs });
}
