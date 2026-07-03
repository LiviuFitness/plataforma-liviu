import type { Metadata, Viewport } from "next";
// Tipografías self-hosted (sin CDN de Google — RGPD, especificación §2)
import "@fontsource/anton";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "./globals.css";
import RegistroSW from "@/componentes/RegistroSW";

export const metadata: Metadata = {
  title: "LIVIU Fitness Studio",
  description: "Plataforma de coaching de LIVIU Fitness Studio",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LIVIU",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0C0E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <RegistroSW />
      </body>
    </html>
  );
}
