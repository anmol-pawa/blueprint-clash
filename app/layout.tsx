import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { inter, jetbrains, pixel } from "./fonts";

export const metadata: Metadata = {
  title: "Blueprint Clash — system design arena",
  description: "A creature-tactics RPG that teaches low-level design in C++ and high-level system design, from fundamentals to FAANG-level interview rounds.",
  // iPhone "Add to Home Screen": open full-screen like an app
  appleWebApp: { capable: true, title: "Blueprint Clash", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#060b18",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${pixel.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
