import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";

import { RegisterSW } from "@/components/register-sw";
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
  manifest: "/manifest.webmanifest",
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Choki",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3B241C",
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
        <RegisterSW />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
