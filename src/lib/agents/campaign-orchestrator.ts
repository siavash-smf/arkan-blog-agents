import "server-only";
import { randomUUID } from "crypto";
import { getStore, type Campaign, type CampaignRunRef } from "@/lib/store";
import { runCampaignStrategist } from "./campaign-strategist";
import { runPipeline } from "./orchestrator";
import { runInstagramPipeline } from "./instagram-orchestrator";
import { runLinkedinPipeline } from "./linkedin-orchestrator";
import { runReelsPipeline } from "./reels-orchestrator";

/**
 * ارکستریتور کمپین — لایه‌ی بالای همه‌ی پایپ‌لاین‌ها.
 *
 * یک تم می‌گیرد، «روایت مادر» می‌سازد، و بعد چهار پایپ‌لاین را با زاویه‌ی
 * اختصاصی هرکدام اجرا می‌کند: بلاگ، کاروسل اینستاگرام، پست لینکدین، ریلز.
 *
 * ── دو تصمیم مهم ──
 *
 * ۱. **اینجا موازی درست است — برخلاف پایپ‌لاین بازآفرینی.**
 *    در بازآفرینی، اینستاگرام و لینکدین روی یک آرایه‌ی steps مشترک
 *    می‌نوشتند و موازی‌کردنشان گام‌ها را می‌انداخت. اینجا هر کانال رکورد
 *    pipeline_runs و آرایه‌ی steps *خودش* را دارد، پس هیچ state مشترکی
 *    نیست. تفاوت در «مالکیت داده» است، نه در سلیقه: همزمانی وقتی امن است
 *    که هر شاخه صاحب داده‌ی خودش باشد.
 *
 * ۲. **allSettled، نه all.** شکست یک کانال نباید بقیه را از بین ببرد.
 *    کمپین با خروجی ناقص هنوز ارزش دارد؛ کمپین بدون خروجی هیچ.
 *
 * ⚠️ محدودیت واقعی: این اجرا چهار پایپ‌لاین کامل است (~۴۰ تا ۵۰ فراخوانی
 * مدل) و چند دقیقه طول می‌کشد. روی پلن Hobby ورسل که سقف اجرا ۶۰ ثانیه
 * است، درخواست HTTP قبل از پایان قطع می‌شود — هرچند اجراها در پس‌زمینه
 * ادامه می‌یابند و نتیجه‌شان در دیتابیس می‌نشیند. برای همین استودیو
 * وضعیت را poll می‌کند و به پاسخِ همان درخواست تکیه نمی‌کند.
 */
export async function runCampaign(opts: {
  campaignId: string;
  theme: string;
}): Promise<Campaign> {
  const store = getStore();
  const { campaignId, theme } = opts;

  const campaign: Campaign = {
    id: campaignId,
    theme,
    narrative: null,
    runIds: [],
    status: "running",
    error: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };
  await store.createCampaign(campaign);

  try {
    // ── ۱. روایت مادر ──
    const existingPosts = await store.listPosts();
    const narrative = await runCampaignStrategist({
      theme,
      existingTitles: existingPosts.map((p) => p.title),
    });
    campaign.narrative = narrative;
    await store.updateCampaign(campaignId, { narrative });

    // ── ۲. شناسه‌ی اجرای هر کانال را *قبل* از شروع می‌سازیم ──
    // تا استودیو بتواند بلافاصله هر سه را poll کند، حتی وقتی هنوز
    // رکوردشان ساخته نشده.
    const refs: CampaignRunRef[] = [
      { channel: "blog", runId: randomUUID(), status: "running" },
      { channel: "instagram", runId: randomUUID(), status: "running" },
      { channel: "linkedin", runId: randomUUID(), status: "running" },
      { channel: "reels", runId: randomUUID(), status: "running" },
    ];
    campaign.runIds = refs;
    await store.updateCampaign(campaignId, { runIds: refs });

    // ── ۳. اجرای موازی چهار کانال ──
    const results = await Promise.allSettled([
      // ⚠️ برای بلاگ و اینستاگرام، «ایده‌ی بزرگ» را هم به راهنمای موضوع
      // می‌چسبانیم. دلیلش را در عمل دیدیم: این دو پایپ‌لاین بعد از گرفتن
      // راهنما، خودشان ایده تولید می‌کنند و بعد یکی را انتخاب می‌کنند —
      // یعنی دو فرصت برای دورشدن از تم. در اولین اجرای چهارکاناله، تم
      // درباره‌ی جلسه‌ها بود ولی مقاله درباره‌ی «تصمیم‌گیری در بازار
      // پرنوسان» درآمد. لنگر انداختن روی bigIdea این فاصله را می‌بندد.
      runPipeline({
        runId: refs[0].runId,
        topicHint: `${narrative.bigIdea} — زاویه‌ی این مقاله: ${narrative.blogAngle}`,
      }),
      runInstagramPipeline({
        runId: refs[1].runId,
        topicHint: `${narrative.bigIdea} — زاویه‌ی این کاروسل: ${narrative.instagramAngle}`,
      }),
      runLinkedinPipeline({
        runId: refs[2].runId,
        // زاویه‌ی لینکدین نقش ماده‌ی خام را بازی می‌کند، ولی صراحتاً
        // «غیرقابل‌اعتماد» علامت می‌خورد: این متن را مدل ساخته، نه انسان.
        // بدون این پرچم، آمارِ ساختگیِ استراتژیست به‌عنوان واقعیت وارد پست
        // می‌شد — که یک بار در عمل هم اتفاق افتاد.
        observation: narrative.linkedinAngle,
        observationIsTrusted: false,
      }),
      runReelsPipeline({
        runId: refs[3].runId,
        sourceText: narrative.reelsAngle,
        // همان دلیل لینکدین: این متن را مدل ساخته، پس جزئیات عددی‌اش
        // واقعیت نیست و نباید وارد اسکریپت شود.
        sourceIsTrusted: false,
      }),
    ]);

    const finalRefs: CampaignRunRef[] = refs.map((ref, i) => {
      const r = results[i];
      return {
        ...ref,
        status: r.status === "fulfilled" ? r.value.status : "error",
      };
    });
    campaign.runIds = finalRefs;

    const failed = finalRefs.filter((r) => r.status === "error");
    campaign.status = failed.length === finalRefs.length ? "error" : "done";
    campaign.error =
      failed.length > 0
        ? `${failed.length} کانال از ${finalRefs.length} کانال ناموفق بود: ${failed.map((f) => f.channel).join("، ")}`
        : null;
    campaign.finishedAt = new Date().toISOString();

    await store.updateCampaign(campaignId, {
      runIds: finalRefs,
      status: campaign.status,
      error: campaign.error,
      finishedAt: campaign.finishedAt,
    });

    return campaign;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    campaign.status = "error";
    campaign.error = message;
    campaign.finishedAt = new Date().toISOString();
    await store.updateCampaign(campaignId, {
      status: "error",
      error: message,
      finishedAt: campaign.finishedAt,
    });
    return campaign;
  }
}
