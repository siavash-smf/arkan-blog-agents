import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // پالت آرکان — هماهنگ با وب‌سایت فاز ۱
        ink: "#101623",
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          500: "#3b63f3",
          600: "#2c4de0",
          700: "#233cb8",
        },
      },
      fontFamily: {
        sans: ["Vazirmatn", "Tahoma", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
