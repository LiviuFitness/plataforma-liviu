import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "LivFit — Plataforma de coaching de LIVIU Fitness Studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen que aparece al compartir el enlace (WhatsApp, redes...). */
export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public", "logo-marca.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0C0E",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={300} height={294} alt="" />
        <div style={{ display: "flex", fontSize: 28, color: "#B9C2C9", marginTop: 32 }}>
          Plataforma de coaching de LIVIU Fitness Studio
        </div>
      </div>
    ),
    size
  );
}
