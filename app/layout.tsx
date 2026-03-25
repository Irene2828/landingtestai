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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AnalysisProvider>{children}</AnalysisProvider>
      </body>
    </html>
  );
}
