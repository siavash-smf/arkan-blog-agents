import "server-only";
import { runSocialEditor, type SocialChannel } from "./social-editor";
import type { SocialCheck } from "./social-checks";
import type { makeStepRunner } from "./run-steps";
import type { SocialBrief, SocialReview } from "./types";

/**
 * حلقه‌ی مشترک «بنویس → چک قطعی → ویراستار → در صورت نیاز بازنویس».
 *
 * هر پایپ‌لاین اجتماعی (بازآفرینی، اینستاگرام مستقل، و در فاز بعد لینکدین
 * مستقل) دقیقاً همین جریان را دارد و فقط توابع نویسنده‌اش فرق می‌کند. پس
 * یک بار نوشته شده و همه از آن استفاده می‌کنند.
 *
 * این فایل ابتدا داخل ارکستریتور بازآفرینی بود؛ با آمدن دومین مصرف‌کننده
 * بیرون کشیده شد — نه زودتر. (انتزاع را وقتی می‌سازیم که تکرار واقعی
 * دیده شود، نه وقتی حدس می‌زنیم شاید لازم شود.)
 */

/** فقط یک دور بازنویسی — متن کوتاه سریع به سقف کیفیتش می‌رسد */
export const MAX_SOCIAL_REVISION_ROUNDS = 1;

type StepFn = ReturnType<typeof makeStepRunner>;

export type SocialLoopResult<T> = {
  draft: T;
  review: SocialReview;
  checks: SocialCheck[];
  revisionRounds: number;
};

export async function writeAndReview<T>(args: {
  step: StepFn;
  channel: SocialChannel;
  /** شناسه‌ی ایجنت نویسنده — صریح داده می‌شود، نه از روی کانال حدس زده شود */
  writerAgent: string;
  /** برچسب فارسی برای نمایش در تایم‌لاین، مثل «اینستاگرام» */
  label: string;
  brief: SocialBrief;
  write: () => Promise<T>;
  revise: (draft: T, review: SocialReview, failedChecks: SocialCheck[]) => Promise<T>;
  check: (draft: T) => SocialCheck[];
  describe: (draft: T) => string;
}): Promise<SocialLoopResult<T>> {
  const { step, channel, writerAgent, label, brief } = args;

  let draft = await step(writerAgent, `کپی‌رایتر ${label} — پیش‌نویس اول`, async () => {
    const out = await args.write();
    return { output: out, summary: `پیش‌نویس نوشته شد — ${args.describe(out)}` };
  });

  let checks = args.check(draft);

  const review1 = await step("social-editor", `ویراستار اجتماعی — ${label}`, async () => {
    const out = await runSocialEditor({
      channel,
      brief,
      draft,
      failedChecks: checks.filter((c) => !c.pass),
    });
    const passed = checks.filter((c) => c.pass).length;
    return {
      output: { review: out, checks },
      summary: `امتیاز ${out.score}/100 — چک‌لیست ${passed}/${checks.length} پاس`,
    };
  });
  let review = review1.review;

  /**
   * آیا باید بازنویسی کنیم؟ دو شرط، با «یا»: نظر ویراستار (قضاوت) **یا**
   * ردشدن هر چک قطعی (کد).
   *
   * نکته‌ی آموزشی مهم: در اولین اجرای واقعی، ویراستار به پستی که قلابش سه
   * برابر حد مجاز بود امتیاز ۷۴ داد و تأییدش کرد — یعنی قضاوت مدل، نتیجه‌ی
   * اندازه‌گیری قطعی کد را دور زد. چیزی که کد قطعی سنجیده نباید با نظر مدل
   * نقض شود، پس شکست چک خودش به‌تنهایی بازنویسی را اجباری می‌کند.
   */
  const needsRevision = (r: SocialReview, cs: SocialCheck[]) =>
    r.verdict === "revise" || cs.some((c) => !c.pass);

  let revisionRounds = 0;
  while (needsRevision(review, checks) && revisionRounds < MAX_SOCIAL_REVISION_ROUNDS) {
    revisionRounds++;
    const failed = checks.filter((c) => !c.pass);
    const previousReview = review;
    const previousDraft = draft;

    draft = await step(writerAgent, `کپی‌رایتر ${label} — بازنویسی`, async () => {
      const out = await args.revise(previousDraft, previousReview, failed);
      return { output: out, summary: `بازنویسی بر اساس ${previousReview.issues.length} ایراد` };
    });

    checks = args.check(draft);

    const again = await step("social-editor", `ویراستار اجتماعی — بازبینی ${label}`, async () => {
      const out = await runSocialEditor({
        channel,
        brief,
        draft,
        failedChecks: checks.filter((c) => !c.pass),
      });
      const passed = checks.filter((c) => c.pass).length;
      return {
        output: { review: out, checks },
        summary: `امتیاز ${out.score}/100 — چک‌لیست ${passed}/${checks.length} پاس`,
      };
    });
    review = again.review;
  }
  // اگر بعد از سقف بازنویسی هنوز ایراد داشت، ادامه می‌دهیم؛ محتوا «پیش‌نویس»
  // می‌ماند تا انسان تصمیم بگیرد (همان الگوی human-in-the-loop بلاگ).

  return { draft, review, checks, revisionRounds };
}
