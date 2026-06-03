import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// next/font wires Inter and Source Serif 4 into CSS variables that
// src/app/globals.css references via @theme (--font-sans / --font-serif).
// Self-hosted, no runtime CSS request — Next pre-bundles the fonts.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "Silhouette",
  description: "A guided micro-reset for when you feel stuck",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      {/* Body bg/color now driven by globals.css @layer base — Tailwind v4
       * tokens replace the previous inline body styles. */}
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
