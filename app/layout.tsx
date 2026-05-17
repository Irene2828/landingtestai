import type { Metadata } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";

import { AnalysisProvider } from "@/components/providers/AnalysisProvider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://landingtestai.vercel.app"),
  title: "Website Analyzer | Find where you're losing customers",
  description:
    "Industrial-grade conversion audits for ambitious brands.",
  openGraph: {
    title: "Website Analyzer | Find where you're losing customers",
    description:
      "Industrial-grade conversion audits for ambitious brands.",
    url: "https://landingtestai.vercel.app",
    siteName: "Axiom",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Website Analyzer | Find where you're losing customers",
    description:
      "Find where your website is losing leads — industrial-grade audit."
  }
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AnalysisProvider>{children}</AnalysisProvider>
      </body>
    </html>
  );
}
