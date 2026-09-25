"use client";

import { useEffect, useState } from "react";
import { BellRing, Dumbbell, MessageCircle, Scale, Share } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import Switch from "@/componentes/Switch";

export type Avisos = { mensajes: boolean; entreno: boolean; peso: boolean };

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** La clave VAPID viene en base64url; el navegador la quiere en bytes. */
function aBytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
  return bytes;
}

type Estado = "cargando" | "no-soportado" | "instalar" | "bloqueado" | "apagado" | "activo";

async function registro(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js");
}

/**
 * Notificaciones: activar en este móvil y elegir cuáles. En iPhone solo
 * funcionan con la app añadida a la pantalla de inicio: si no lo está,
 * se explica cómo en vez de enseñar un botón que no haría nada.
 */
export default function PanelAvisos({
  usuarioId,
  avisos: iniciales,
  paraEntrenador = false,
}: {
  usuarioId: string;
  avisos: Avisos;
  /** El entrenador solo recibe mensajes de sus clientes. */
  paraEntrenador?: boolean;
}) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [avisos, setAvisos] = useState(iniciales);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const soporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const instalada =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!soporta || !CLAVE_PUBLICA) {
        setEstado(esIOS && !instalada ? "instalar" : "no-soportado");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("bloqueado");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sus = await reg?.pushManager.getSubscription();
      setEstado(sus && Notification.permission === "granted" ? "activo" : "apagado");
    })();
  }, []);

  async function activar() {
    setTrabajando(true);
    setError("");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "apagado");
        return;
      }
      const reg = await registro();
      await navigator.serviceWorker.ready;
      const sus =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE_PUBLICA) }));
      const json = sus.toJSON();
      const { error } = await crearClienteNavegador()
        .from("push_suscripciones")
        .upsert({
          endpoint: sus.endpoint,
          usuario_id: usuarioId,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        });
      if (error) throw error;
      setEstado("activo");
    } catch {
      setError("No se pudieron activar. Inténtalo de nuevo.");
    } finally {
      setTrabajando(false);
    }
  }

  async function desactivar() {
    setTrabajando(true);
    const reg = await navigator.serviceWorker.getRegistration();
    const sus = await reg?.pushManager.getSubscription();
    if (sus) {
      await crearClienteNavegador().from("push_suscripciones").delete().eq("endpoint", sus.endpoint);
      await sus.unsubscribe().catch(() => {});
    }
    setEstado("apagado");
    setTrabajando(false);
  }

  async function cambiar(clave: keyof Avisos, valor: boolean) {
    const nuevos = { ...avisos, [clave]: valor };
    setAvisos(nuevos);
    const { error } = await crearClienteNavegador().rpc("guardar_avisos", { p_avisos: nuevos });
    if (error) setAvisos(avisos);
  }

  const tipos: [keyof Avisos, typeof MessageCircle, string, string][] = paraEntrenador
    ? [["mensajes", MessageCircle, "Mensajes de tus clientes", "Al momento"]]
    : [
        ["mensajes", MessageCircle, "Mensajes de tu entrenador", "Al momento"],
        ["entreno", Dumbbell, "Recordatorio de entreno", "Si llevas 2 días sin entrenar, por la mañana"],
        ["peso", Scale, "Pesarte", "Los lunes por la mañana"],
      ];

  return (
    <section className="tarjeta">
      <div className="titulo-tarjeta flex items-center gap-1.5">
        <BellRing size={13} /> NOTIFICACIONES
      </div>

      {estado === "instalar" && (
        <div className="text-[13.5px] text-texto-2 leading-relaxed">
          En iPhone llegan solo con la app en la pantalla de inicio: en Safari, toca{" "}
          <Share size={13} className="inline -mt-0.5" /> <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.
          Ábrela desde ese icono y vuelve aquí para activarlas.
        </div>
      )}
      {estado === "no-soportado" && (
        <div className="text-[13.5px] text-atenuado">Este navegador no admite notificaciones.</div>
      )}
      {estado === "bloqueado" && (
        <div className="text-[13.5px] text-texto-2 leading-relaxed">
          Las tienes bloqueadas para LivFit. Actívalas en los Ajustes del móvil › Notificaciones › LivFit.
        </div>
      )}
      {estado === "apagado" && (
        <button className="cta !mb-0" onClick={activar} disabled={trabajando}>
          {trabajando ? "Activando…" : "Activar en este móvil"}
        </button>
      )}

      {estado === "activo" && (
        <>
          {tipos.map(([clave, Icono, titulo, detalle]) => (
            <div key={clave} className="flex items-center gap-3 py-2.5 border-b border-borde last:border-0">
              <Icono size={17} className="text-acento shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold leading-tight">{titulo}</div>
                <div className="text-atenuado text-[12px]">{detalle}</div>
              </div>
              <Switch checked={avisos[clave]} onChange={(v) => cambiar(clave, v)} label={titulo} />
            </div>
          ))}
          <button className="text-atenuado text-[12.5px] underline underline-offset-2 mt-2.5 cursor-pointer" onClick={desactivar} disabled={trabajando}>
            Desactivarlas en este móvil
          </button>
        </>
      )}
      {error && <div className="text-peligro text-[13px] mt-2">— {error}</div>}
    </section>
  );
}
