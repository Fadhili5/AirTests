/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        aviation: {
          base: "#081321",
          panel: "#0f1d31",
          glass: "rgba(18, 33, 56, 0.82)",
          accent: "#3bd8d0",
          good: "#41d78c",
          warn: "#ffb44a",
          danger: "#ff6f6f",
        },
      },
      boxShadow: {
        panel: "0 6px 18px rgba(4, 14, 28, 0.18)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};
