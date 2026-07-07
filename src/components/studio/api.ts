"use client";

/**
 * کمکی fetch سمت کلاینت برای استودیو.
 * اگر سرور STUDIO_PASSWORD داشته باشد، رمز واردشده در localStorage نگه
 * داشته می‌شود و با هر درخواست در هدر x-studio-password می‌رود.
 */

const KEY = "arkan-studio-password";

export function getStudioPassword(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) ?? "";
}

export function setStudioPassword(value: string) {
  localStorage.setItem(KEY, value);
}

export async function studioFetch(input: string, init?: RequestInit) {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-studio-password": getStudioPassword(),
      ...init?.headers,
    },
  });
  if (res.status === 401) throw new Error("PASSWORD_REQUIRED");
  return res;
}
