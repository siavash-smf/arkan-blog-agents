import "server-only";
import type { BlogStore } from "./types";
import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";

export * from "./types";

/**
 * انتخاب خودکار لایه‌ی ذخیره‌سازی:
 * - اگر Supabase تنظیم شده باشد → دیتابیس واقعی (پروداکشن)
 * - وگرنه → حافظه‌ی موقت (فقط برای توسعه‌ی محلی)
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let cached: BlogStore | null = null;

export function getStore(): BlogStore {
  if (!cached) {
    cached = isSupabaseConfigured() ? new SupabaseStore() : new MemoryStore();
  }
  return cached;
}
