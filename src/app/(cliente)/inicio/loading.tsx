import { EsqueletoCabecera, EsqueletoTarjeta } from "@/componentes/Esqueleto";

/* Misma silueta que la pantalla: la tarjeta del entreno, "Tu día" y los
 * dos mosaicos. Si el esqueleto no se parece a lo que llega, el salto
 * al cargar se nota más que la propia espera. */
export default function CargandoInicio() {
  return (
    <>
      <EsqueletoCabecera />
      <EsqueletoTarjeta alto={300} />
      <EsqueletoTarjeta alto={190} className="mt-6" />
      <div className="grid grid-cols-2 gap-2.5 mb-[18px]">
        <EsqueletoTarjeta alto={98} className="!mb-0" />
        <EsqueletoTarjeta alto={98} className="!mb-0" />
      </div>
    </>
  );
}
