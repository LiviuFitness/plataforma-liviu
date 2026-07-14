import { EsqueletoLinea } from "@/componentes/Esqueleto";

export default function CargandoChat() {
  const burbujas = [
    { ancho: "55%", propio: false },
    { ancho: "40%", propio: false },
    { ancho: "62%", propio: true },
    { ancho: "35%", propio: false },
    { ancho: "48%", propio: true },
  ];
  return (
    <>
      <div className="mb-4">
        <EsqueletoLinea ancho="30%" alto={28} />
      </div>
      <div className="flex flex-col gap-3">
        {burbujas.map((b, i) => (
          <div
            key={i}
            className={`animate-pulse rounded-[16px] bg-borde-2 ${b.propio ? "self-end" : "self-start"}`}
            style={{ width: b.ancho, height: 38 }}
          />
        ))}
      </div>
    </>
  );
}
