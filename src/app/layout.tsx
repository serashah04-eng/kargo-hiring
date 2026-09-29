import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Kargo Hiring",
  description: "Rubric-based hiring decision support for Kargo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${serif.variable} antialiased`}>
      <body className="min-h-screen">
        <div className="mx-auto flex max-w-[1440px] gap-6 p-3 sm:p-5">
          <Nav />
          <main className="relative min-w-0 flex-1 overflow-hidden rounded-[28px] bg-surface-2/60 px-4 pb-28 pt-6 sm:px-8 sm:pt-8 md:pb-10">
            <div className="glow" />
            <div className="relative z-10">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
