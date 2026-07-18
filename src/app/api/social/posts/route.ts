import { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/** GET /api/social/posts — فهرست محتوای اجتماعی (با فیلتر اختیاری پست مبدأ) */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const sourcePostId = req.nextUrl.searchParams.get("sourcePostId") ?? undefined;
  const socialPosts = await getStore().listSocialPosts({ sourcePostId });

  return Response.json({ socialPosts });
}
