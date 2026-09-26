import type { Metadata, Viewport } from "next";
// Tipografía self-hosted (sin CDN de Google — RGPD, especificación §2)
import "@fontsource-variable/inter";
// Cifras grandes: condensada deportiva (también self-hosted)
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800-italic.css";
import "./globals.css";
import RegistroSW from "@/componentes/RegistroSW";

/* Pantalla de arranque del iPhone (app añadida a la pantalla de inicio).
 * Sin ella, iOS enseña un fogonazo blanco hasta que carga la primera
 * pantalla. Una imagen por tamaño de pantalla: iOS solo la usa si
 * coincide exacta. Generadas desde el logo (fondo de la app + logo). */
const PANTALLAS_IPHONE: [number, number, number][] = [
  [440, 956, 3],
  [430, 932, 3],
  [402, 874, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 3],
  [414, 896, 2],
  [414, 736, 3],
  [375, 667, 2],
  [320, 568, 2],
];

export const metadata: Metadata = {
  metadataBase: new URL("https://app.livfit.es"),
  title: "LivFit",
  description: "Plataforma de coaching de LIVIU Fitness Studio",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icono-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "LivFit",
    statusBarStyle: "black-translucent",
    startupImage: PANTALLAS_IPHONE.map(([w, h, d]) => ({
      url: `/arranque/arranque-${w * d}x${h * d}.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)`,
    })),
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
  /* La app es oscura: así el navegador no pinta nada en blanco mientras
   * carga (fondo, barras de desplazamiento, campos) */
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" style={{ backgroundColor: "#0a0c0e" }}>
      <body className="min-h-full flex flex-col">
        {children}
        <RegistroSW />
      </body>
    </html>
  );
}
