import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const APP_NAME = "IsItFR";
const APP_TITLE = "IsItFR";
const APP_DESCRIPTION =
  "Media & information literacy training and offline crisis help";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_TITLE,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IsItFR Help",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(geistSans.variable)}>
      <body className="min-h-svh font-sans antialiased">
        <header className="border-b">
          <nav
            aria-label="Primary"
            className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3"
          >
            <Link
              href="/"
              prefetch={false}
              className={cn(buttonVariants({ variant: "ghost" }), "font-medium")}
            >
              IsItFR
            </Link>
            <Link
              href="/train"
              prefetch={false}
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Train
            </Link>
            <Link
              href="/help"
              prefetch={false}
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "ml-auto font-semibold uppercase tracking-wide",
              )}
            >
              Help
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
