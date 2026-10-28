import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeWatcher } from "@/components/theme-watcher";
import { I18nProvider } from "@/lib/i18n/client";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { themeScript } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CorsaIQ",
  description:
    "Operationele intelligentie voor teams die scherper willen beslissen.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeWatcher />
        <I18nProvider locale={locale} dictionary={dictionary}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
