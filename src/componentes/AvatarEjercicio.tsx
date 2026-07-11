import Image from "next/image";
import { Play } from "lucide-react";
import { miniaturaYoutube } from "@/lib/rutinas";

/** Icono circular del ejercicio: miniatura real de su vídeo si tiene, si no un genérico.
 * Con vídeo lleva un icono de play superpuesto — a este tamaño tan pequeño,
 * la miniatura sola no se distinguía de un icono decorativo cualquiera. */
export default function AvatarEjercicio({
  videoUrl,
  tamano = 40,
}: {
  videoUrl: string | null;
  tamano?: number;
}) {
  const miniatura = miniaturaYoutube(videoUrl);

  if (miniatura) {
    return (
      <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
        <Image
          src={miniatura}
          alt=""
          width={tamano}
          height={tamano}
          unoptimized
          className="rounded-full object-cover bg-campo"
          style={{ width: tamano, height: tamano }}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-fondo/20 rounded-full">
          <Play size={tamano * 0.42} className="text-white fill-white" />
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-full bg-campo border border-borde-2 flex items-center justify-center shrink-0"
      style={{ width: tamano, height: tamano, fontSize: tamano * 0.5 }}
    >
      🏋️
    </div>
  );
}
