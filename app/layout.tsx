import "./globals.css";
import type { Metadata } from "next";
import { Shell } from "@/components/ui";

export const metadata: Metadata = {
  title: "Quote Desk - sample-data demo",
  description: "Independent demo: deterministic machine-shop quoting with an order book that commits machine-hours. Invented sample data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
