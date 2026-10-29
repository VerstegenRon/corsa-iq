import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono, Unbounded } from "next/font/google";
import "./globals.css";

import { ServiceWorker } from "@/components/service-worker";
import { ThemeWatcher } from "@/components/theme-watcher";
import { I18nProvider } from "@/lib/i18n/client";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { themeScript } from "@/lib/theme";

// Unbounded for titles, Inter Tight for text, JetBrains Mono for every number and channel label.
const display = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: ["700", "900"] });
const sans = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Corsa IQ",
  description:
    "Je hele kartseizoen in één pitbox: rondetijden, onderhoud, kosten en bonnetjes.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, dictionary] = await Promise.all([getLocale(), getDictionary()]);

  return (
    // data-theme is rendered as "dark" and corrected by the head script before paint, so the
    // attribute may differ at hydration; suppressHydrationWarning keeps the script's value.
    <html
      lang={locale}
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeWatcher />
        <ServiceWorker />
        <I18nProvider locale={locale} dictionary={dictionary}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
