import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16818A",
          700: "#126A72",
          600: "#16818A",
          100: "#DDF3F2",
        },
        navy: { 900: "#152536" },
        slate: { 600: "#526577", 200: "#DDE5EA" },
        canvas: "#F4F7F8",
        surface: "#FFFFFF",
        success: "#16865C",
        warning: "#B77812",
        danger: "#C33E4A",
        info: "#3478C8",
        border: "#DDE5EA",
        background: "#F4F7F8",
        foreground: "#152536",
        muted: {
          DEFAULT: "#F4F7F8",
          foreground: "#526577",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#152536",
        },
        input: "#DDE5EA",
        ring: "#16818A",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "page-title": ["28px", { lineHeight: "34px", fontWeight: "700" }],
        "section-title": ["18px", { lineHeight: "26px", fontWeight: "650" }],
        "card-metric": ["26px", { lineHeight: "32px", fontWeight: "700" }],
        body: ["14px", { lineHeight: "21px", fontWeight: "400" }],
        "table-header": ["12px", { lineHeight: "16px", fontWeight: "650" }],
      },
      borderRadius: {
        card: "14px",
        control: "10px",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
