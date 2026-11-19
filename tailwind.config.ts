import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand accent: deep olive. Chosen for a shop-floor / industrial read, continuity with the v1 lime
        // accent (now darkened so it holds contrast on a light ground), and separation from indigo/violet
        // and from the sibling demos (navy / teal / bronze / crimson / burnt-orange).
        accent: { DEFAULT: "#4d7c0f", hover: "#3f6212" },
        ground: "#fbfbfa",
        hair: "#e4e4e0",
        ink: "#1c1c1a",
        mute: "#6b6b66",
      },
      borderRadius: { btn: "8px", card: "10px" },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
