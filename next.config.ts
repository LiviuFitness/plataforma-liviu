import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Miniaturas de vídeos de ejercicios (YouTube las genera solas, gratis)
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  experimental: {
    // Todas las páginas son "force-dynamic" (datos por cliente), así que
    // por defecto (0s) CADA navegación —incluso ir y volver entre Inicio
    // y Perfil— repite la petición al servidor entera. Con esto, moverse
    // entre pantallas ya visitadas hace unos segundos se siente instantáneo
    // (caché del router en el navegador); las mutaciones siguen forzando
    // datos frescos con router.refresh() como ya hacían.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
