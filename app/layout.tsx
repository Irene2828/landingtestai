import type { Metadata } from "next";

import { AnalysisProvider } from "@/components/providers/AnalysisProvider";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://landingtestai.vercel.app"),
  title: "AI Landing Page Analyzer",
  description:
    "Compare Hero, CTA, and Social Proof against competitors with evidence-backed UX recommendations and confidence levels.",
  openGraph: {
    title: "AI Landing Page Analyzer",
    description:
      "Compare Hero, CTA, and Social Proof against competitors with evidence-backed UX recommendations and confidence levels.",
    url: "https://landingtestai.vercel.app",
    siteName: "AI Landing Page Analyzer",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "AI Landing Page Analyzer",
    description:
      "Compare Hero, CTA, and Social Proof against competitors with evidence-backed UX recommendations and confidence levels."
  }
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AnalysisProvider>{children}</AnalysisProvider>
      </body>
    </html>
  );
}
