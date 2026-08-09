import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isTheme, THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Platform-only chrome: theme, tooltips, toasts, and the platform colour
 * surface. Deliberately NOT in the root layout.
 *
 * Published sites render from the same root layout on a different origin
 * (Plan 30). Anything mounted at the root reaches them too, which caused two
 * problems: the platform's light/dark theme followed the *visitor's* OS
 * preference instead of the author's design, and every published page
 * hydrated `ThemeProvider` even when the document had no interactive node —
 * breaking the zero-JS guarantee that `pageNeedsRuntime` otherwise enforces.
 *
 * Wrap platform routes in this; leave `/p` and `/embed` bare.
 */
export async function PlatformChrome({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_STORAGE_KEY)?.value;
  const initialTheme = isTheme(themeCookie) ? themeCookie : "system";

  return (
    <ThemeProvider initialTheme={initialTheme}>
      <TooltipProvider>
        <div className="platform-surface flex min-h-screen flex-col">{children}</div>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
