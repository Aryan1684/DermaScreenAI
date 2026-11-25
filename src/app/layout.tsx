import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AnalysisProvider } from "@/components/AnalysisContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "DermaScreen AI – Skin Condition Screening Prototype",
  description:
    "An academic AI-based skin screening prototype that runs in your browser. Educational use only – not a medical diagnosis.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e7490",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <AnalysisProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
          <Navbar />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
        </AnalysisProvider>
      </body>
    </html>
  );
}
