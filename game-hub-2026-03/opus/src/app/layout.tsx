import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Game Hub - Multiplayer Games",
  description: "Play Tic-Tac-Toe and Rock Paper Scissors with friends or against AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} font-[family-name:var(--font-geist-sans)] antialiased min-h-screen bg-[#0a0a0f] text-[#e8e8ed]`}>
        {children}
      </body>
    </html>
  );
}
