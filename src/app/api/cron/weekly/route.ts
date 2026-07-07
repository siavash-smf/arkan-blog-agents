import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { runPipeline } from "@/lib/agents/orchestrator";
import { isConfigured } from "@/lib/ai";
import { isSupabaseConfigured } from "@/lib/store";

/**
 * GET /api/cron/weekly — اجرای خودکار هفتگی (کرون Vercel، دوشنبه‌ها ۶ صبح UTC).
 *
 * این همان «خودکاری کامل» است: بدون هیچ دخالتی، هر هفته یک مقاله‌ی جدید
 * تولید می‌شود. اگر ویراستار تأیید کند مستقیم منتشر می‌شود؛ وگرنه
 * پیش‌نویس می‌ماند تا مدیر در استودیو تصمیم بگیرد.
 *
 * امنیت: Vercel هدر Authorization: Bearer ${CRON_SECRET} را می‌فرستد.
 */

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isConfigured()) {
    return Response.json({ error: "OPENROUTER_API_KEY تنظیم نشده است." }, { status: 500 });
  }
  if (!isSupabaseConfigured()) {
    // بدون دیتابیس واقعی، اجرای کرون بی‌معنی است (خروجی جایی ذخیره نمی‌شود)
    return Response.json({ error: "کرون نیازمند Supabase است." }, { status: 500 });
  }

  const run = await runPipeline({ runId: randomUUID(), topicHint: null });
  return Response.json({
    status: run.status,
    postId: run.postId,
    error: run.error,
  });
}
