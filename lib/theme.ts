export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

export function isTheme(value: string | undefined | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function themeToHtmlClass(theme: Theme): string {
  if (theme === "dark") {
    return "dark";
  }
  if (theme === "light") {
    return "light";
  }
  return "";
}

export function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");

  if (theme === "light") {
    root.classList.add("light");
  } else if (theme === "dark") {
    root.classList.add("dark");
  }
}

export function readStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable in private browsing
  }

  return "system";
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "light" || theme === "dark") {
    return theme;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function persistTheme(theme: Theme): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }

  document.cookie = `${THEME_STORAGE_KEY}=${theme};path=/;max-age=31536000;SameSite=Lax`;
}
