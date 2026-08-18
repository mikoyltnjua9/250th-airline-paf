import type { Metadata } from "next";
import { Public_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Public Sans — the typeface built for U.S. federal digital services
// (USWDS). Chosen deliberately for an institutional/government dashboard
// over a generic startup-default font.
const publicSans = Public_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wing Safety Dashboard — 250th PAW",
  description: "Centralized safety, licensing, and currency dashboard for the 250th Presidential Airlift Wing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
