import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/shared/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mint: "#6ee7b7",
        lagoon: "#0f766e",
        sand: "#f8f4eb",
        ember: "#9a3412",
        rosebrick: "#7c2d12"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(15, 118, 110, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;

