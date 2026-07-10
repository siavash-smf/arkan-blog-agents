import "server-only";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { z } from "zod";

/**
 * هسته‌ی AI — همان الگوی فاز ۲: همه‌ی مدل‌ها از طریق OpenRouter.
 *
 * دو کمکی اصلی این فایل، سنگ‌بنای همه‌ی ایجنت‌ها هستند:
 * - runAgentText: خروجی متنی آزاد (برای نویسنده)
 * - runAgentJSON: خروجی ساخت‌یافته + اعتبارسنجی Zod + یک بار تلاش مجدد
 *
 * نکته‌ی آموزشی: به‌جای اتکا به JSON mode مدل‌ها (که بین مدل‌های مختلف
 * OpenRouter ناسازگار است)، خودمان JSON را از پاسخ استخراج و با Zod
 * اعتبارسنجی می‌کنیم و اگر خراب بود، خطا را به مدل برمی‌گردانیم تا اصلاح کند.
 * این الگوی «validate + retry» در هر سیستم ایجنتی واقعی لازم است.
 */

export function getOpenRouter() {
  return createOpenAICompatible({
    name: "openrouter",
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    headers: {
      "HTTP-Referer": "https://github.com/siavash-smf/arkan-blog-agents",
      "X-Title": "Arkan Blog Agents",
    },
    // محدودکردن reasoning به سطح پایین (همان درسِ فاز ۲):
    // برخی مدل‌ها استدلال اجباری دارند و ممکن است کل بودجه‌ی توکن را صرف آن کنند.
    fetch: (async (url: string, options: RequestInit | undefined) => {
      if (options?.body && typeof options.body === "string") {
        try {
          const body = JSON.parse(options.body);
          body.reasoning = { effort: "low" };
          options = { ...options, body: JSON.stringify(body) };
        } catch {
          /* اگر بدنه JSON نبود، دست‌نخورده بماند */
        }
      }
      return fetch(url, options);
    }) as typeof fetch,
  });
}

export function isConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/** مدل پیش‌فرض همه‌ی ایجنت‌ها؛ برای نویسنده می‌توان مدل قوی‌تر جدا تعیین کرد */
export function defaultModel(): string {
  return process.env.PIPELINE_MODEL || "google/gemini-2.5-flash";
}

export function writerModel(): string {
  return process.env.WRITER_MODEL || defaultModel();
}

export type AgentCallOptions = {
  /** نام ایجنت — فقط برای پیام‌های خطای خواناتر */
  agent: string;
  system: string;
  prompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

/** اجرای یک ایجنت با خروجی متنی آزاد */
export async function runAgentText(opts: AgentCallOptions): Promise<string> {
  const openrouter = getOpenRouter();
  const model = openrouter(opts.model ?? defaultModel());

  // پاسخ خالی معمولاً گذراست: بعضی مدل‌ها (مثل Gemini) کل بودجه‌ی توکن را صرف
  // reasoning می‌کنند و متنی نمی‌ماند، یا API لحظه‌ای خطا می‌دهد. چند بار تلاش
  // می‌کنیم تا یک خطای گذرا کل پایپ‌لاین را نکُشد.
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await generateText({
        model,
        system: opts.system,
        prompt: opts.prompt,
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxOutputTokens ?? 8000,
      });
      if (result.text.trim()) return result.text;
      lastErr = "پاسخ خالی بود (احتمالاً بودجه‌ی توکن صرف reasoning شد)";
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`ایجنت «${opts.agent}» بعد از ۳ تلاش پاسخ معتبری نداد: ${lastErr}`);
}

/** استخراج اولین شیء JSON از متن (مدل‌ها گاهی دور آن توضیح یا ``` می‌گذارند) */
function extractJson(text: string): string {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("هیچ شیء JSON در پاسخ پیدا نشد.");
  }
  return cleaned.slice(start, end + 1);
}

export type AgentJSONOptions<T> = AgentCallOptions & {
  /** اسکیمای Zod برای اعتبارسنجی خروجی */
  schema: z.ZodType<T>;
  /** نمونه‌ی شکل خروجی که داخل پرامپت به مدل نشان داده می‌شود */
  shapeHint: string;
};

/**
 * اجرای یک ایجنت با خروجی JSON اعتبارسنجی‌شده.
 * اگر بار اول JSON نامعتبر بود، یک بار دیگر با پیام خطا تلاش می‌کند.
 */
export async function runAgentJSON<T>(opts: AgentJSONOptions<T>): Promise<T> {
  const jsonInstruction =
    `\n\n— قالب خروجی —\n` +
    `خروجی تو باید «فقط» یک شیء JSON معتبر باشد؛ بدون هیچ توضیح، مقدمه یا \`\`\`.\n` +
    `دقیقاً با این ساختار:\n${opts.shapeHint}`;

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const retryNote = lastError
      ? `\n\nتلاش قبلی‌ات معتبر نبود. خطا: ${lastError}\nاین بار فقط JSON معتبر مطابق ساختار بده.`
      : "";

    // فراخوانی داخل try/catch است تا خطای «پاسخ خالی» هم به‌جای شکست کل
    // پایپ‌لاین، یک تلاش مجدد بشود (نه فقط خطای JSON نامعتبر).
    try {
      const text = await runAgentText({
        ...opts,
        prompt: opts.prompt + jsonInstruction + retryNote,
        // خروجی ساخت‌یافته با دمای پایین‌تر پایدارتر است
        temperature: opts.temperature ?? 0.4,
      });
      const parsed = JSON.parse(extractJson(text));
      return opts.schema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err.message.slice(0, 500) : String(err);
    }
  }
  throw new Error(`ایجنت «${opts.agent}» بعد از ۲ تلاش خروجی معتبر نداد: ${lastError}`);
}
