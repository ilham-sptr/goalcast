import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0B1F17",       // deep pitch green-black
        pitchLine: "#1E3A2C",   // field line green
        flare: "#F2C94C",       // ball / trophy gold
        signal: "#4FE3A1",      // live/on-chain signal green
        chalk: "#F2F0E6",       // chalk white
        clay: "#C9663B"         // referee card orange-red, used sparingly
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"]
      }
    }
  },
  plugins: []
};
export default config;
