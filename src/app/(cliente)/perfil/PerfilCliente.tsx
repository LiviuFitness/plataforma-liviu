"use client";

import { useState } from "react";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import type { Perfil } from "@/lib/tipos";

/** Perfil del cliente: datos, cambio de contraseña y derechos RGPD. */
export default function PerfilCliente({ perfil }: { perfil: Perfil }) {
  const [contrasena, setContrasena] = useState("");
  const [repetida, setRepetida] = useState("");
  const [msgContrasena, setMsgContrasena] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [msgExporta, setMsgExporta] = useState("");

  async function cambiarContrasena() {
    setMsgContrasena(null);
    if (contrasena.length < 8) {
      setMsgContrasena({ ok: false, texto: "Mínimo 8 caracteres." });
      return;
    }
    if (contrasena !== repetida) {
      setMsgContrasena({ ok: false, texto: "Las contraseñas no coinciden." });
      return;
    }
    setCambiando(true);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.updateUser({ password: contrasena });
    setCambiando(false);
    if (error) {
      setMsgContrasena({ ok: false, texto: "No se pudo cambiar. Inténtalo de nuevo." });
      return;
    }
    setContrasena("");
    setRepetida("");
    setMsgContrasena({ ok: true, texto: "Contraseña cambiada ✓" });
  }

  /* Derecho de portabilidad (RGPD): exporta todos sus datos en JSON */
  async function exportarDatos() {
    setExportando(true);
    setMsgExporta("");
    const supabase = crearClienteNavegador();

    const [perfilR, medidas, sesiones, dieta, rutina] = await Promise.all([
      supabase.from("profiles").select("nombre, email, fecha_alta, objetivo, plan, consentimiento_salud, fecha_nacimiento, altura_cm, sexo").eq("id", perfil.id).maybeSingle(),
      supabase.from("medidas").select("fecha, peso, cintura, pecho, brazo, pierna").eq("cliente_id", perfil.id).order("fecha"),
      supabase
        .from("sesiones")
        .select("fecha_inicio, fecha_fin, sensacion, notas_cliente, rutina_dias(nombre), series_realizadas(orden, tipo, kg, reps, rir, completada)")
        .eq("cliente_id", perfil.id)
        .order("fecha_inicio"),
      supabase.from("dietas").select("kcal_obj, prot_obj, carb_obj, gras_obj, dieta_comidas(nombre, descripcion_libre)").eq("cliente_id", perfil.id).eq("activa", true),
      supabase
        .from("rutinas")
        .select("nombre, activa, rutina_dias(nombre, rutina_ejercicios(descanso_seg, notas, ejercicios(nombre), series_prescritas(tipo, kg, reps, rir)))")
        .eq("cliente_id", perfil.id),
    ]);

    const datos = {
      exportado_en: new Date().toISOString(),
      perfil: perfilR.data,
      medidas: medidas.data ?? [],
      sesiones: sesiones.data ?? [],
      dieta: dieta.data ?? [],
      rutinas: rutina.data ?? [],
    };

    const blob = new Blob([JSON.stringify(datos, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `mis-datos-livfit-${new Date().toLocaleDateString("sv-SE")}.json`;
    enlace.click();
    URL.revokeObjectURL(url);

    setExportando(false);
    setMsgExporta("Datos descargados ✓");
  }

  return (
    <>
      <h1 className="h1">Perfil</h1>
      <div className="sub mb-4">tus datos, bajo control —</div>

      <section className="tarjeta">
        <div className="titulo-tarjeta">MIS DATOS</div>
        <div className="flex justify-between py-2 border-b border-borde text-[14px]">
          <span className="text-atenuado">Nombre</span>
          <span className="font-bold">{perfil.nombre}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-borde text-[14px]">
          <span className="text-atenuado">Email</span>
          <span>{perfil.email}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-borde text-[14px]">
          <span className="text-atenuado">Objetivo</span>
          <span>{perfil.objetivo ?? "—"}</span>
        </div>
        <div className="flex justify-between py-2 text-[14px]">
          <span className="text-atenuado">Plan</span>
          <span className="capitalize">{perfil.plan ?? "—"}</span>
        </div>
        <p className="text-atenuado text-[12px] mt-2">
          ¿Algún dato incorrecto? Pídele el cambio a tu entrenador.
        </p>
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">CAMBIAR CONTRASEÑA</div>
        <input
          className="input"
          type="password"
          placeholder="Contraseña nueva (mínimo 8 caracteres)"
          autoComplete="new-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Repite la contraseña"
          autoComplete="new-password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
        />
        {msgContrasena && (
          <div
            className={`text-[13.5px] mb-3 ${
              msgContrasena.ok ? "text-acento" : "text-peligro"
            }`}
          >
            — {msgContrasena.texto}
          </div>
        )}
        <button
          className="cta !mb-0"
          onClick={cambiarContrasena}
          disabled={cambiando || contrasena === ""}
        >
          {cambiando ? "Cambiando…" : "Cambiar contraseña"}
        </button>
      </section>

      <section className="tarjeta">
        <div className="titulo-tarjeta">MIS DATOS Y MI PRIVACIDAD</div>
        <p className="text-texto-2 text-[13.5px] mb-3">
          Puedes descargar una copia completa de tus datos (perfil, medidas,
          entrenos y dieta) en cualquier momento.
        </p>
        <button className="ghost w-full mb-2" onClick={exportarDatos} disabled={exportando}>
          {exportando ? "Preparando…" : "⬇ Exportar mis datos (JSON)"}
        </button>
        {msgExporta && (
          <div className="text-acento text-[13px] mb-2">{msgExporta}</div>
        )}
        <p className="text-atenuado text-[12.5px]">
          Para eliminar tu cuenta y todos tus datos, pídeselo a tu entrenador o
          escribe al contacto de la{" "}
          <Link
            href="/politica-privacidad"
            className="underline underline-offset-2"
            target="_blank"
          >
            política de privacidad
          </Link>
          . Se atenderá en un plazo máximo de un mes.
        </p>
      </section>

      <div className="text-center text-[12px] text-atenuado mt-2">
        <Link href="/aviso-legal" className="underline underline-offset-2">
          Aviso legal
        </Link>
        {" · "}
        <Link href="/terminos" className="underline underline-offset-2">
          Términos
        </Link>
      </div>
    </>
  );
}
