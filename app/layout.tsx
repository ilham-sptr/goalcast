import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoalCast — AI World Cup Companion on Injective",
  description:
    "Live World Cup dashboard, AI match analyst, and an on-chain fan prediction pool powered by Injective's MCP Server, x402, and CCTP."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-pitch text-chalk font-body antialiased">{children}</body>
    </html>
  );
}
