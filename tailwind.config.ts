import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3efe4",
        card: "#fffdf8",
        ink: "#1c1915",
        muted: "#5e584e",
        line: "#e3dac8",
        teal: {
          DEFAULT: "#0e6b56",
          dark: "#08483b",
          soft: "#e6f4ef",
        },
        copper: {
          DEFAULT: "#c4622d",
          soft: "#fbe8dc",
        },
        gold: "#a16207",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(28,25,21,0.04), 0 12px 32px rgba(28,25,21,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
