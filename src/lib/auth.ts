import "server-only";
import type { NextRequest } from "next/server";

/**
 * محافظ ساده‌ی استودیو:
 * - اگر STUDIO_PASSWORD تنظیم نشده باشد → همه‌چیز باز است (حالت توسعه).
 * - اگر تنظیم شده باشد → کلاینت باید رمز را در هدر x-studio-password بفرستد.
 *
 * برای پروژه‌ی درسی کافی است؛ برای پروداکشن واقعی از session/کوکی امضاشده
 * استفاده کنید (نمونه‌اش در فاز ۲ پیاده شده است).
 */

export function isStudioAuthorized(req: NextRequest): boolean {
  const password = process.env.STUDIO_PASSWORD;
  if (!password) return true;
  return req.headers.get("x-studio-password") === password;
}

export function unauthorized(): Response {
  return Response.json({ error: "رمز استودیو نادرست است." }, { status: 401 });
}
