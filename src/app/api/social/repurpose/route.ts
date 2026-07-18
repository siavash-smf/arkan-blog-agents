import { NextRequest } from "next/server";
import { z } from "zod";
import { runRepurpose } from "@/lib/agents/repurpose-orchestrator";
import { isConfigured } from "@/lib/ai";
import { isStudioAuthorized, unauthorized } from "@/lib/auth";
import { getStore } from "@/lib/store";

/**
 * POST /api/social/repurpose — بازآفرینی یک پست بلاگ برای شبکه‌های اجتماعی.
 *
 * دقیقاً همان قرارداد /api/pipeline/run: کلاینت runId می‌سازد، بعد با
 * GET /api/pipeline/runs/[id] پیشرفت را poll می‌کند. مسیر polling جدیدی
 * لازم نیست — هر دو نوع اجرا در همان جدول pipeline_runs زندگی می‌کنند.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  runId: z.string().uuid(),
  sourcePostId: z.string().uuid(),
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

  const post = await getStore().getPost(parsed.data.sourcePostId);
  if (!post) return Response.json({ error: "پست مبدأ پیدا نشد." }, { status: 404 });

  // فیلتر سمت کلاینت فقط راحتیِ کاربر است، نه دروازه. دروازه اینجاست.
  if (post.status !== "published") {
    return Response.json(
      { error: "فقط از پست منتشرشده می‌توان محتوای اجتماعی ساخت." },
      { status: 400 }
    );
  }

  const run = await runRepurpose({
    runId: parsed.data.runId,
    sourcePostId: parsed.data.sourcePostId,
  });

  return Response.json({ run });
}
