import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Miniaturas de vídeos de ejercicios (YouTube las genera solas, gratis)
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
