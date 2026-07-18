import "server-only";
import { getStore, type PipelineRun, type StepRecord } from "@/lib/store";

/**
 * سازنده‌ی تابع step — همان مکانیزمی که نمایش زنده‌ی استودیو را ممکن می‌کند.
 *
 * هر گام بلافاصله (هم موقع شروع، هم موقع پایان) در دیتابیس آینه می‌شود، و
 * استودیو هر ۲ ثانیه همان رکورد اجرا را می‌خواند. یعنی «وضعیت در دیتابیس،
 * نه در حافظه» — بدون وب‌سوکت، بدون صف، فقط polling ساده.
 *
 * نکته‌ی آموزشی: چرا factory و نه یک تابع معمولی که run را پارامتر بگیرد؟
 * چون step باید روی *همان* آرایه‌ی steps بنویسد که ارکستریتور در پایان
 * برمی‌گرداند. با بستن (closure) روی شیء run، این اشتراک تضمین می‌شود.
 *
 * این تابع قبلاً یک closure داخل runPipeline بود. حالا که دو ارکستریتور
 * داریم (بلاگ و بازآفرینی اجتماعی)، بیرونش کشیدیم تا هر دو دقیقاً یک رفتار
 * داشته باشند — نه دو کپیِ کمی متفاوت که با اولین تغییر از هم واگرا شوند.
 */
export function makeStepRunner(run: PipelineRun) {
  const store = getStore();

  /** ثبت شروع/پایان هر گام + آینه‌کردن آن در دیتابیس */
  return async function step<T>(
    agent: string,
    label: string,
    fn: () => Promise<{ output: T; summary: string }>
  ): Promise<T> {
    const record: StepRecord = {
      agent,
      label,
      status: "running",
      summary: "",
      output: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };
    run.steps.push(record);
    await store.updateRun(run.id, { steps: run.steps });

    try {
      const { output, summary } = await fn();
      record.status = "done";
      record.summary = summary;
      record.output = output;
      record.finishedAt = new Date().toISOString();
      await store.updateRun(run.id, { steps: run.steps });
      return output;
    } catch (err) {
      record.status = "error";
      record.summary = err instanceof Error ? err.message : String(err);
      record.finishedAt = new Date().toISOString();
      await store.updateRun(run.id, { steps: run.steps });
      throw err;
    }
  };
}
