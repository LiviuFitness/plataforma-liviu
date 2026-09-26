import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

/**
 * Notificaciones push (solo servidor). Las claves VAPID identifican a
 * LivFit ante Apple/Google; sin ellas no se manda nada y la app sigue
 * funcionando igual.
 *
 * Lee suscripciones y preferencias de todos los usuarios, así que usa
 * la clave de servicio de Supabase: por eso vive aquí y nunca en el
 * navegador.
 */

export type TipoAviso = "mensajes" | "entreno" | "peso" | "cambios" | "revision" | "cobros";

export interface Aviso {
  titulo: string;
  cuerpo: string;
  /** A dónde lleva al tocarla */
  url: string;
  /** Avisos con la misma etiqueta se sustituyen en vez de amontonarse */
  etiqueta?: string;
}

let configurado: boolean | null = null;

export function pushDisponible(): boolean {
  if (configurado !== null) return configurado;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  configurado = !!(publica && privada && servicio);
  if (configurado) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:info@livfit.es", publica!, privada!);
  }
  return configurado;
}

export function clienteServicio() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Manda un aviso a cada usuario que lo tenga activado. Las suscripciones
 * caducadas (el móvil desinstaló la app o revocó el permiso) se borran.
 * Devuelve cuántos móviles lo recibieron.
 */
export async function enviarAvisos(usuarioIds: string[], tipo: TipoAviso, aviso: (id: string) => Aviso | null) {
  if (!pushDisponible() || usuarioIds.length === 0) return 0;
  const db = clienteServicio();
  const [{ data: perfiles }, { data: suscripciones }] = await Promise.all([
    db.from("profiles").select("id, avisos").in("id", usuarioIds),
    db.from("push_suscripciones").select("endpoint, usuario_id, p256dh, auth").in("usuario_id", usuarioIds),
  ]);
  const quiere = new Set(
    (perfiles ?? [])
      .filter((p) => (p.avisos as Record<string, boolean> | null)?.[tipo] !== false)
      .map((p) => p.id as string)
  );

  let enviados = 0;
  const caducadas: string[] = [];
  await Promise.all(
    (suscripciones ?? [])
      .filter((s) => quiere.has(s.usuario_id))
      .map(async (s) => {
        const contenido = aviso(s.usuario_id);
        if (!contenido) return;
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(contenido),
            { TTL: 60 * 60 * 12 }
          );
          enviados++;
        } catch (e) {
          const estado = (e as { statusCode?: number }).statusCode;
          if (estado === 404 || estado === 410) caducadas.push(s.endpoint);
        }
      })
  );
  if (caducadas.length > 0) await db.from("push_suscripciones").delete().in("endpoint", caducadas);
  return enviados;
}
