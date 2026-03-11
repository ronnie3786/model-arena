import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0b1220",
        panel: "#121a2c",
        panelAlt: "#19223a",
        text: "#f3f6fb",
        muted: "#94a3b8",
        ttt: "#22c55e",
        rps: "#a855f7",
        danger: "#ef4444",
        warn: "#facc15",
      },
      fontFamily: {
        display: ["Trebuchet MS", "Verdana", "sans-serif"],
        body: ["Trebuchet MS", "Verdana", "sans-serif"],
      },
      keyframes: {
        fadeScale: {
          "0%": { opacity: "0", transform: "scale(0.72)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0.18)" },
          "50%": { boxShadow: "0 0 0 12px rgba(34,197,94,0)" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        revealFlip: {
          "0%": { transform: "rotateY(0deg) scale(0.94)", opacity: "0.5" },
          "100%": { transform: "rotateY(360deg) scale(1)", opacity: "1" },
        },
      },
      animation: {
        fadeScale: "fadeScale 220ms ease-out",
        pulseGlow: "pulseGlow 1.6s ease-in-out infinite",
        riseIn: "riseIn 500ms ease-out both",
        revealFlip: "revealFlip 800ms cubic-bezier(.2,.7,.2,1) both",
      },
      boxShadow: {
        glowGreen: "0 0 0 1px rgba(34,197,94,0.3), 0 18px 50px rgba(34,197,94,0.18)",
        glowPurple: "0 0 0 1px rgba(168,85,247,0.3), 0 18px 50px rgba(168,85,247,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
