import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo-2",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Choki",
  description: "El emprendimiento familiar, paso a paso.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${baloo.variable} ${nunito.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
