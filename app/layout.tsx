import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Locked Lab - Terminal",
  description: "An AI trapped in an old lab terminal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
