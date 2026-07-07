import type { Config } from "tailwindcss";

/**
 * توکن‌های دیزاین — سبک «Trust & Authority» تطبیق‌یافته با برند آرکان.
 * رنگ‌ها فقط از همین توکن‌ها مصرف می‌شوند (نه hex خام داخل کامپوننت‌ها).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // سرمه‌ای برند آرکان — متن اصلی و سطوح تیره
        ink: {
          DEFAULT: "#101623",
          soft: "#1c2537",
          muted: "#475569",
        },
        // آبی برند — کنش اصلی
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#6089f8",
          500: "#3b63f3",
          600: "#2c4de0",
          700: "#233cb8",
          800: "#213394",
          900: "#1f2f75",
        },
        // سطوح
        surface: {
          DEFAULT: "#ffffff",
          dim: "#f6f8fb",
          line: "#e6eaf2",
        },
        // معنایی
        success: { DEFAULT: "#0d9463", soft: "#e7f6f0" },
        warn: { DEFAULT: "#b45309", soft: "#fdf3e3" },
        danger: { DEFAULT: "#dc2626", soft: "#fdeeee" },
      },
      fontFamily: {
        sans: ["var(--font-vazirmatn)", "Tahoma", "sans-serif"],
      },
      fontSize: {
        // مقیاس تایپوگرافی ثابت
        "display": ["2.75rem", { lineHeight: "1.25", fontWeight: "900" }],
        "headline": ["1.75rem", { lineHeight: "1.35", fontWeight: "800" }],
        "title": ["1.125rem", { lineHeight: "1.5", fontWeight: "700" }],
      },
      boxShadow: {
        // مقیاس ارتفاع یکدست
        card: "0 1px 2px 0 rgb(16 22 35 / 0.04), 0 1px 3px 0 rgb(16 22 35 / 0.06)",
        raised: "0 4px 12px -2px rgb(16 22 35 / 0.08), 0 2px 4px -1px rgb(16 22 35 / 0.04)",
        overlay: "0 16px 40px -8px rgb(16 22 35 / 0.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
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
