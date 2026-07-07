import { NextRequest } from "next/server";
import { getStore } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/** GET /api/posts — همه‌ی پست‌ها (پیش‌نویس و منتشرشده) برای استودیو */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isStudioAuthorized(req)) return unauthorized();
  const posts = await getStore().listPosts();
  return Response.json({ posts });
}
