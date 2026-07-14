import { EsqueletoCabecera, EsqueletoTarjeta } from "@/componentes/Esqueleto";

export default function CargandoPerfil() {
  return (
    <>
      <EsqueletoCabecera />
      <div className="grid grid-cols-3 gap-2.5 mb-3.5">
        <EsqueletoTarjeta alto={92} className="!mb-0" />
        <EsqueletoTarjeta alto={92} className="!mb-0" />
        <EsqueletoTarjeta alto={92} className="!mb-0" />
      </div>
      <EsqueletoTarjeta alto={220} />
      <EsqueletoTarjeta alto={80} />
      <EsqueletoTarjeta alto={160} />
    </>
  );
}
