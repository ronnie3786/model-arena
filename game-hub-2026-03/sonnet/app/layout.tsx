import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Hub",
  description: "Multiplayer Tic-Tac-Toe and Rock Paper Scissors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0a0a0f] text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
