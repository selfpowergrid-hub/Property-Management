import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nyumba360 — Property & Rent Management",
  description: "Multi-tenant property and rent management for the Kenyan market.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
