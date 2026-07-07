import "server-only";
import { z } from "zod";
import { runAgentJSON } from "@/lib/ai";
import { COMPANY_PROFILE } from "@/lib/company";
import { lessonsBlockFor } from "./lessons";
import { ResearchSchema, type Brief, type Research } from "./types";

/**
 * ایجنت ۳ — پژوهشگر (Researcher)
 *
 * وظیفه: جمع‌آوری ماده‌ی خام مقاله — فکت‌ها، مثال‌ها و سؤال‌های رایج —
 * تا نویسنده از خودش «نبافد» (کاهش توهم).
 *
 * نکته‌ی آموزشی — الگوی «مدل تصمیم می‌گیرد، کد اجرا می‌کند»:
 * اگر کلید Tavily موجود باشد، مرحله‌ی اول از مدل «کوئری جستجو» می‌گیریم
 * (تصمیم با LLM)، ولی خودِ جستجو را با fetch معمولی در کد انجام می‌دهیم
 * (اجرای قطعی). این تفکیک از دادنِ ابزار آزاد به مدل قابل‌اعتمادتر است.
 * بدون کلید، پژوهشگر به دانش خود مدل تکیه می‌کند و پایپ‌لاین نمی‌شکند.
 */

const QueriesSchema = z.object({ queries: z.array(z.string()).min(2).max(4) });

type SearchResult = { title: string; url: string; content: string };

async function tavilySearch(query: string): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 3,
      search_depth: "basic",
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: String(r.content ?? "").slice(0, 800),
  }));
}

export async function runResearcher(input: { brief: Brief }): Promise<Research> {
  const lessons = await lessonsBlockFor("researcher");
  const { brief } = input;

  const system = `تو «پژوهشگر» تیم محتوای آرکان هستی. ماده‌ی خام دقیق و قابل‌استناد برای نویسنده آماده می‌کنی. اغراق نمی‌کنی و آمار بی‌منبع نمی‌سازی.

${COMPANY_PROFILE}${lessons}`;

  // مرحله‌ی اختیاری: جستجوی واقعی وب
  let webContext = "";
  if (process.env.TAVILY_API_KEY) {
    const { queries } = await runAgentJSON({
      agent: "researcher",
      system,
      prompt: `برای مقاله‌ای با این مشخصات، ۲ تا ۴ کوئری جستجوی وب طراحی کن (فارسی یا انگلیسی، هرکدام مؤثرتر است):
عنوان: ${brief.title}
کلمه‌ی کلیدی اصلی: ${brief.primaryKeyword}
مخاطب: ${brief.audience}`,
      schema: QueriesSchema,
      shapeHint: `{ "queries": ["کوئری اول", "کوئری دوم"] }`,
    });

    const allResults = (await Promise.all(queries.map(tavilySearch))).flat();
    if (allResults.length > 0) {
      webContext =
        `\n\nنتایج جستجوی وب (فقط به‌عنوان ماده‌ی خام؛ صحت‌سنجی با توست):\n` +
        allResults
          .map((r) => `- ${r.title} (${r.url})\n  ${r.content}`)
          .join("\n");
    }
  }

  const prompt = `بریف مقاله:
عنوان: ${brief.title}
مخاطب: ${brief.audience}
نیت جستجو: ${brief.searchIntent}
ساختار: ${brief.outline.map((s) => s.heading).join(" / ")}${webContext}

بر این اساس، ماده‌ی خام پژوهشی مقاله را آماده کن:
- keyFacts: نکته‌ها و فکت‌های کلیدی که مقاله باید بگوید (اگر آماری مطمئن نیستی، به‌جای عدد دقیق، روند یا اصل را بگو).
- examples: مثال‌های ملموس از فضای کسب‌وکار ایران که نویسنده بتواند استفاده کند.
- commonQuestions: سؤال‌هایی که مخاطب واقعاً درباره‌ی این موضوع دارد (برای بخش FAQ).
- angleNotes: توصیه‌ات به نویسنده برای متمایزکردن مقاله.`;

  return runAgentJSON({
    agent: "researcher",
    system,
    prompt,
    schema: ResearchSchema,
    shapeHint: `{
  "keyFacts": ["فکت یا نکته کلیدی"],
  "examples": ["مثال ملموس"],
  "commonQuestions": ["سؤال رایج مخاطب"],
  "angleNotes": "توصیه‌ها به نویسنده"
}`,
  });
}
