import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Misterdil — Ententes professionnelles",
    template: "%s · Misterdil",
  },
  description: "Créez vos ententes plus rapidement. Une Collaboration plus smart pour relier votre réseau et avancer votre stratégie.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
