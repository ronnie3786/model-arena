import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Dynamic classes used in templates
    'bg-green-500/20',
    'bg-purple-500/20',
    'bg-green-500/40',
    'bg-purple-500/40',
    'bg-green-600',
    'bg-purple-600',
    'hover:bg-green-500',
    'hover:bg-purple-500',
    'border-green-500/50',
    'border-purple-500/50',
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
