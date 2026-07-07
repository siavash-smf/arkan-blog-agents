import type { Config } from "tailwindcss";

/**
 * توکن‌های دیزاین — هماهنگ با «برند گاید آرکان» (همان سایت اصلی).
 * پالت: سبز کاج (اصلی)، برنجی (تأکید)، استخوانی/شنی (سطوح روشن).
 * رنگ‌ها فقط از همین توکن‌ها مصرف می‌شوند، نه hex خام داخل کامپوننت‌ها.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // رنگ‌های پایه‌ی برند (مثل سایت)
        pine: { DEFAULT: "#143A32", dark: "#0F2C26" },
        brass: { DEFAULT: "#B5853A", dark: "#9A6F2E" },
        bone: "#F7F3EC",
        sand: "#E7DECF",

        // متن — «مرکبی» برای متن اصلی، «خاکستری‌سبز» برای فرعی
        ink: {
          DEFAULT: "#15201C",
          soft: "#2b3a33",
          muted: "#5A5F5B",
        },

        // سطوح: سفید (کارت)، استخوانی (پس‌زمینه)، شنی (خط/سطح ثانویه)
        surface: {
          DEFAULT: "#ffffff",
          dim: "#F7F3EC",
          line: "#E7DECF",
        },

        // «brand» به مقیاس سبز کاج نگاشت شده تا کنش اصلی = کاج شود
        // (bg-brand-600 → کاج، hover:bg-brand-700 → کاج تیره، text-brand-600 → کاج).
        brand: {
          50: "#eef3f0",
          100: "#dbe6e0",
          200: "#bcd0c7",
          300: "#93b3a7",
          400: "#5c8b7d",
          500: "#2f6455",
          600: "#143A32",
          700: "#0F2C26",
          800: "#0c231e",
          900: "#091a16",
        },

        // رنگ‌های معنایی (وضعیت‌ها) — متمایز اما هماهنگ با برند
        success: { DEFAULT: "#0d7a52", soft: "#e6f2ec" },
        warn: { DEFAULT: "#9A6F2E", soft: "#f6efe1" },
        danger: { DEFAULT: "#b3392e", soft: "#f7ebe9" },
      },
      fontFamily: {
        // بدنه: وزیرمتن — عناوین در globals روی استعداد تنظیم می‌شوند
        sans: ["var(--font-vazirmatn)", "Tahoma", "sans-serif"],
        heading: ["var(--font-estedad)", "var(--font-vazirmatn)", "sans-serif"],
      },
      fontSize: {
        display: ["2.75rem", { lineHeight: "1.2", fontWeight: "700" }],
        headline: ["1.9rem", { lineHeight: "1.3", fontWeight: "700" }],
        title: ["1.125rem", { lineHeight: "1.5", fontWeight: "700" }],
      },
      boxShadow: {
        // سایه‌های بسیار ملایم — مثل سایت (بدون جلوه‌ی براق)
        card: "0 1px 2px rgba(20,58,50,0.04), 0 8px 24px rgba(20,58,50,0.05)",
        raised: "0 2px 4px rgba(20,58,50,0.05), 0 12px 32px rgba(20,58,50,0.07)",
        overlay: "0 16px 40px -8px rgba(20,58,50,0.18)",
      },
      borderRadius: {
        xl2: "1rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
