"use client";

import { useRef, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

const TAMANO_MAX = 512;

/** Redimensiona en el navegador antes de subir: una foto de móvil
 * pesa varios MB y un avatar no necesita tanto. */
function redimensionar(archivo: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const escala = Math.min(1, TAMANO_MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala);
      const h = Math.round(img.height * escala);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => reject(new Error("imagen invalida"));
    img.src = url;
  });
}

/** Foto de perfil circular: toca para elegir/cambiar la imagen. */
export default function SubidaAvatar({
  userId,
  avatarUrl,
  nombre,
}: {
  userId: string;
  avatarUrl: string | null;
  nombre: string;
}) {
  const [url, setUrl] = useState(avatarUrl);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      setError("Elige un archivo de imagen.");
      return;
    }
    setError("");
    setSubiendo(true);
    try {
      const blob = await redimensionar(archivo);
      const supabase = crearClienteNavegador();
      const ruta = `${userId}/avatar.jpg`;
      const { error: e1 } = await supabase.storage
        .from("avatars")
        .upload(ruta, blob, { upsert: true, contentType: "image/jpeg" });
      if (e1) throw e1;
      const { data } = supabase.storage.from("avatars").getPublicUrl(ruta);
      const nuevaUrl = `${data.publicUrl}?v=${Date.now()}`;
      const { error: e2 } = await supabase.rpc("actualizar_mi_avatar", {
        p_avatar_url: nuevaUrl,
      });
      if (e2) throw e2;
      setUrl(nuevaUrl);
    } catch {
      setError("No se pudo subir la foto. Inténtalo de nuevo.");
    }
    setSubiendo(false);
  }

  return (
    <div className="flex flex-col items-center mb-3">
      <button
        type="button"
        className="relative w-24 h-24 rounded-full overflow-hidden bg-campo border-2 border-borde-2 cursor-pointer disabled:opacity-70"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        aria-label="Cambiar foto de perfil"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-[26px] font-bold text-atenuado">
            {iniciales || "🙂"}
          </span>
        )}
        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[11px] py-1 text-center">
          {subiendo ? "Subiendo…" : "Cambiar"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={elegirArchivo}
      />
      {error && <div className="text-peligro text-[12.5px] mt-1.5">— {error}</div>}
    </div>
  );
}
