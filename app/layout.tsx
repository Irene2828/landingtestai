import type { Metadata } from "next";

import { AnalysisProvider } from "@/components/providers/AnalysisProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Competitive Landing Page Analyzer",
  description: "Mock results UI for a landing page analysis MVP."
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
