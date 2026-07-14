import { EsqueletoCabecera, EsqueletoTarjeta } from "@/componentes/Esqueleto";

export default function CargandoInicio() {
  return (
    <>
      <EsqueletoCabecera />
      <div className="grid grid-cols-2 gap-2.5 mb-[18px]">
        <EsqueletoTarjeta alto={98} className="!mb-0" />
        <EsqueletoTarjeta alto={98} className="!mb-0" />
      </div>
      <EsqueletoTarjeta alto={168} />
      <EsqueletoTarjeta alto={110} />
      <EsqueletoTarjeta alto={160} />
      <EsqueletoTarjeta alto={90} />
      <EsqueletoTarjeta alto={90} />
    </>
  );
}
