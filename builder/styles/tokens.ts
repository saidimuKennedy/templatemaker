import type { DesignTokens } from "./types";

export const defaultTokens: DesignTokens = {
  colors: {
    primary: "#2563eb",
    secondary: "#64748b",
    background: "#ffffff",
    foreground: "#0f172a",
    muted: "#f1f5f9",
    accent: "#f59e0b",
    error: "#dc2626",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
  typography: {
    body: { fontSize: "16px", fontWeight: 400, lineHeight: "1.5" },
    heading: { fontSize: "24px", fontWeight: 600, lineHeight: "1.25" },
    caption: { fontSize: "12px", fontWeight: 400, lineHeight: "1.4" },
  },
};

export function resolveToken(
  tokens: DesignTokens,
  category: keyof DesignTokens,
  key: string,
): string | undefined {
  const bucket = tokens[category];
  if (!bucket || typeof bucket !== "object") {
    return undefined;
  }

  if (category === "typography") {
    const entry = tokens.typography[key];
    return entry?.fontSize;
  }

  const value = (bucket as Record<string, string>)[key];
  return typeof value === "string" ? value : undefined;
}
