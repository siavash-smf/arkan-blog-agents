import { NextRequest } from "next/server";
import { getStore, type Post, type SocialPost } from "@/lib/store";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";

/**
 * GET /api/campaigns/[id] — وضعیت کمپین + اجرای هر کانال + **خروجی** هر کانال.
 *
 * چرا خروجی را هم اینجا برمی‌گردانیم؟ چون کاربر در پنل کمپین می‌خواهد روی
 * هر کانال کلیک کند و محتوای تولیدشده را ببیند. اگر فقط اجراها را
 * می‌دادیم، کلاینت باید برای هر کانال یک درخواست جدا می‌زد و شناسه‌ها را
 * خودش دنبال می‌کرد. یک درخواست، کل تصویر.
 */

export const dynamic = "force-dynamic";

export type CampaignChannelOutput = {
  channel: string;
  run: unknown;
  /** خروجی بلاگ */
  post: Post | null;
  /** خروجی کانال‌های اجتماعی (کاروسل، لینکدین، ریلز) */
  socialPosts: SocialPost[];
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isStudioAuthorized(req)) return unauthorized();

  const store = getStore();
  const campaign = await store.getCampaign(params.id);
  if (!campaign) return Response.json({ error: "کمپین پیدا نشد." }, { status: 404 });

  const runs = await Promise.all(
    campaign.runIds.map(async (ref) => {
      const run = await store.getRun(ref.runId);

      // خروجی را از روی خودِ رکورد اجرا پیدا می‌کنیم: بلاگ postId دارد و
      // کانال‌های اجتماعی socialPostIds. اجرای ناتمام هنوز هیچ‌کدام را ندارد.
      const post = run?.postId ? await store.getPost(run.postId) : null;
      const socialPosts = run?.socialPostIds?.length
        ? (
            await Promise.all(run.socialPostIds.map((sid) => store.getSocialPost(sid)))
          ).filter((p): p is SocialPost => p !== null)
        : [];

      return { channel: ref.channel, run, post, socialPosts };
    })
  );

  return Response.json({ campaign, runs });
}
