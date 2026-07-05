import type { Metadata, Viewport } from "next";
// Tipografía self-hosted (sin CDN de Google — RGPD, especificación §2)
import "@fontsource-variable/inter";
import "./globals.css";
import RegistroSW from "@/componentes/RegistroSW";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.livfit.es"),
  title: "LivFit",
  description: "Plataforma de coaching de LIVIU Fitness Studio",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icono-192.png",
    apple: "/icono-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "LivFit",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "LivFit",
    description: "Plataforma de coaching de LIVIU Fitness Studio",
    siteName: "LivFit",
    locale: "es_ES",
    type: "website",
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
