import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#EEEDF9",
          100: "#CCCAF0",
          200: "#AAA7E7",
          300: "#8884DE",
          400: "#6661D5",
          500: "#534AB7",
          600: "#4239A3",
          700: "#322B8F",
          800: "#221D7B",
          900: "#120E67",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
