import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { isTheme, THEME_STORAGE_KEY, themeToHtmlClass } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Portfolio Generation Engine",
    template: "%s | Portfolio Engine",
  },
  description: "Create, preview, and publish structured portfolios",
};

/**
 * Root layout is shared by the app origin AND the published-site origin
 * (Plan 30), so it holds nothing platform-specific: no theme provider, no
 * toasts, no platform colour tokens. Platform routes opt into that chrome via
 * `<PlatformChrome>`; `/p` and `/embed` deliberately get none of it, which is
 * what keeps published output author-controlled and zero-JS.
 *
 * The theme class still resolves server-side for the app origin's no-flash
 * first paint. On the site origin the cookie is never present (separate
 * registrable domain), so it resolves to "system" and emits no class.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_STORAGE_KEY)?.value;
  const initialTheme = isTheme(themeCookie) ? themeCookie : "system";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${themeToHtmlClass(initialTheme)}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
