import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        comun: {
          black: "#0b0b0a",
          asphalt: "#171816",
          concrete: "#6d6a63",
          paper: "#f4efe4",
          yellow: "#f4c400",
          rust: "#8f2f1d",
          red: "#c6251d",
          green: "#228b45"
        }
      },
      boxShadow: {
        mural: "0 18px 40px rgba(0,0,0,0.22)"
      }
    }
  },
  plugins: []
};

export default config;
