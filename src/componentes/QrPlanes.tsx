"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download } from "lucide-react";
import { URL_PUBLICA } from "@/lib/planes";

/**
 * Genera el QR que lleva a la página pública de planes. Se dibuja en el
 * navegador (nada que guardar en servidor): Liviu escribe de dónde va a
 * colgarlo, se descarga el PNG y lo imprime.
 *
 * El "origen" viaja como ?origen= en la URL y se guarda con el lead, así
 * se sabe qué cartel funciona sin tener que preguntarle a nadie.
 */
export default function QrPlanes() {
  const [origen, setOrigen] = useState("");
  const [imagen, setImagen] = useState("");
  const [copiado, setCopiado] = useState(false);

  const limpio = origen.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
  const url = URL_PUBLICA + "/planes" + (limpio ? `?origen=${encodeURIComponent(limpio)}` : "");

  useEffect(() => {
    let vivo = true;
    QRCode.toDataURL(url, {
      width: 900,
      margin: 2,
      /* Módulos oscuros sobre blanco: un QR con el fondo oscuro de la app
       * no lo lee la mitad de los móviles. */
      color: { dark: "#0a0c0e", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then((d) => vivo && setImagen(d));
    return () => {
      vivo = false;
    };
  }, [url]);

  async function copiar() {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="tarjeta !p-5 mb-2.5">
      <div className="titulo-tarjeta">QR para captar clientes</div>
      <p className="text-atenuado text-[12.5px] mb-3 leading-relaxed">
        Quien lo escanee verá tus dos planes y podrá dejarte sus datos. No se da
        de alta ni paga nada: te llega a <b className="text-texto-2">Leads</b> y le
        escribes tú.
      </p>

      <input
        className="input !mb-2"
        placeholder="¿Dónde lo vas a poner? (gimnasio, flyer…)"
        value={origen}
        onChange={(e) => setOrigen(e.target.value)}
      />

      <div className="flex flex-col items-center gap-3">
        {imagen && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagen}
            alt="Código QR de la página de planes"
            className="w-[190px] h-[190px] rounded-[12px] bg-white p-1"
          />
        )}
        <code className="text-[11.5px] text-atenuado break-all text-center">{url}</code>
      </div>

      <div className="flex gap-2 mt-3">
        <a
          className="ghost flex items-center justify-center gap-1.5 !w-auto flex-1"
          href={imagen}
          download={`qr-livfit${limpio ? "-" + limpio : ""}.png`}
        >
          <Download size={15} /> Descargar
        </a>
        <button
          className="ghost flex items-center justify-center gap-1.5 !w-auto flex-1"
          onClick={copiar}
        >
          {copiado ? <Check size={15} className="text-acento" /> : <Copy size={15} />}
          {copiado ? "Copiado" : "Copiar enlace"}
        </button>
      </div>
    </div>
  );
}
