import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#8B3FD4",
          50: "#F3EAFE",
          100: "#E6D4FD",
          200: "#CDAAFB",
          300: "#B47FF9",
          400: "#9B54F6",
          500: "#8B3FD4",
          600: "#7233B2",
          700: "#572890",
          800: "#3C1C6E",
          900: "#1E0A3C",
        },
        dark: "#1E0A3C",
        light: "#F3EAFE",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
