import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppFrame } from "./AppFrame";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Uptexx Research Automation",
  description: "PDF ve Excel raporlu araştırma ajanları paneli",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
