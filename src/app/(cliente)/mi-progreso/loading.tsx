import { EsqueletoCabecera, EsqueletoTarjeta } from "@/componentes/Esqueleto";

export default function CargandoMiProgreso() {
  return (
    <>
      <EsqueletoCabecera />
      <EsqueletoTarjeta alto={170} />
      <EsqueletoTarjeta alto={220} />
      <EsqueletoTarjeta alto={200} />
      <EsqueletoTarjeta alto={140} />
    </>
  );
}
