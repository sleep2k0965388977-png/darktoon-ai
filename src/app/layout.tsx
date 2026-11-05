import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DARKTOON AI — Audio to 2D Animated Storytelling Studio",
  description:
    "AI-powered Audio to Dark Minimalist 2D Animated Video Generator with Hybrid 2D Rigging, Character Consistency, and Scene-by-Scene Review.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-[#0B0B0D] text-[#F5F5F5] antialiased">
        {children}
      </body>
    </html>
  );
}
