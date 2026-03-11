import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        hubBg: "#0b1020",
        panel: "#141b33",
        ttt: "#38f4b8",
        rps: "#bc67ff"
      },
      fontFamily: {
        display: ["Trebuchet MS", "Verdana", "sans-serif"],
        body: ["Avenir", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
