import Image from "next/image";
import { miniaturaYoutube } from "@/lib/rutinas";

/** Icono circular del ejercicio: miniatura real de su vídeo si tiene, si no un genérico. */
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
      <Image
        src={miniatura}
        alt=""
        width={tamano}
        height={tamano}
        unoptimized
        className="rounded-full object-cover shrink-0 bg-campo"
        style={{ width: tamano, height: tamano }}
      />
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
