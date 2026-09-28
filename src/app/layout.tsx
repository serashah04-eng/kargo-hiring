import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["400", "500", "700"] });
const mono = Space_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Kargo Hiring",
  description: "Rubric-based hiring decision support for Kargo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable} antialiased`}>
      <body className="min-h-screen">
        <header className="border-b-[3px] border-ink bg-ink text-cream">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center border-2 border-cream text-lg font-black">K</span>
              <span className="text-lg font-black uppercase tracking-tight">Kargo · Hiring</span>
            </Link>
            <span className="hidden text-xs font-bold uppercase tracking-widest sm:block">
              The system recommends. Arjun decides.
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
