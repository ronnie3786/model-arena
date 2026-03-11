import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Arcade Pulse",
  description: "Multiplayer game hub for Tic-Tac-Toe and Rock Paper Scissors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
