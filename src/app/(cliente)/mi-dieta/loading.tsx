import { EsqueletoCabecera, EsqueletoTarjeta } from "@/componentes/Esqueleto";

export default function CargandoMiDieta() {
  return (
    <>
      <EsqueletoCabecera />
      <EsqueletoTarjeta alto={190} />
      <EsqueletoTarjeta alto={120} />
      <EsqueletoTarjeta alto={120} />
      <EsqueletoTarjeta alto={120} />
    </>
  );
}
