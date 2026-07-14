"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Flame, Scale, Trophy } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/cliente";
import { IconoTarjeta } from "@/componentes/ui";
import { useCountUp } from "@/lib/useCountUp";
import SubidaAvatar from "@/componentes/SubidaAvatar";
import Switch from "@/componentes/Switch";
import BotonSalir from "@/componentes/BotonSalir";
import PreferenciasEjercicios from "./PreferenciasEjercicios";
import type { Ejercicio, Perfil } from "@/lib/tipos";

/** Perfil del cliente: dashboard, datos, contraseña, ejercicios a evitar y RGPD. */
export default function PerfilCliente({
  perfil,
  biblioteca,
  ejerciciosExcluidos,
  racha,
  totalSesiones,
  ultimoPeso,
}: {
  perfil: Perfil;
  biblioteca: Ejercicio[];
  ejerciciosExcluidos: string[];
  racha: number;
  totalSesiones: number;
  ultimoPeso: number | null;
}) {
  const [visibleComunidad, setVisibleComunidad] = useState(perfil.visible_en_comunidad);
  const [guardandoComunidad, setGuardandoComunidad] = useState(false);

  const rachaAnimada = useCountUp(racha);
  const sesionesAnimadas = useCountUp(totalSesiones);
  const pesoAnimado = useCountUp(ultimoPeso ?? 0, 1);

  async function cambiarVisibleComunidad(valor: boolean) {
    setVisibleComunidad(valor);
    setGuardandoComunidad(true);
    const supabase = crearClienteNavegador();
    await supabase
      .from("profiles")
      .update({ visible_en_comunidad: valor })
      .eq("id", perfil.id);
    setGuardandoComunidad(false);
  }

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

      {/* Dashboard: racha, sesiones totales, peso actual */}
      <div className="grid grid-cols-3 gap-2.5 mb-3.5">
        <div className="tarjeta tarjeta-dorado !mb-0 !p-3.5 flex flex-col items-center text-center gap-1.5">
          <IconoTarjeta Icono={Flame} color="var(--color-dorado)" tamano={34} />
          <span className="num-grande !text-[19px]">{rachaAnimada}</span>
          <span className="text-atenuado text-[10.5px] leading-tight">
            {racha === 1 ? "día de racha" : "días de racha"}
          </span>
        </div>
        <div className="tarjeta tarjeta-acento !mb-0 !p-3.5 flex flex-col items-center text-center gap-1.5">
          <IconoTarjeta Icono={Trophy} color="var(--color-acento)" tamano={34} />
          <span className="num-grande !text-[19px]">{sesionesAnimadas}</span>
          <span className="text-atenuado text-[10.5px] leading-tight">sesiones totales</span>
        </div>
        <div className="tarjeta tarjeta-turquesa !mb-0 !p-3.5 flex flex-col items-center text-center gap-1.5">
          <IconoTarjeta Icono={Scale} color="var(--color-turquesa)" tamano={34} />
          <span className="num-grande !text-[19px]">
            {ultimoPeso !== null ? pesoAnimado.toFixed(1) : "—"}
          </span>
          <span className="text-atenuado text-[10.5px] leading-tight">
            {ultimoPeso !== null ? "kg" : "sin peso"}
          </span>
        </div>
      </div>

      <section className="tarjeta">
        <div className="titulo-tarjeta">MIS DATOS</div>
        <SubidaAvatar
          userId={perfil.id}
          avatarUrl={perfil.avatar_url}
          nombre={perfil.nombre}
        />
        <div className="flex justify-between py-2 border-b border-borde text-[14px]">
          <span className="text-atenuado">Nombre</span>
          <span className="font-bold">{perfil.nombre}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-borde text-[14px]">
          <span className="text-atenuado">Email</span>
          <span>{perfil.email}</span>
        </div>
        <div className="flex justify-between py-2 text-[14px]">
          <span className="text-atenuado">Objetivo</span>
          <span>{perfil.objetivo ?? "—"}</span>
        </div>
        <p className="text-atenuado text-[12px] mt-2">
          ¿Algún dato incorrecto? Pídele el cambio a tu entrenador.
        </p>
      </section>

      {perfil.plan && (
        <section className="tarjeta !py-3 flex items-center justify-between">
          <div className="titulo-tarjeta !mb-0">TU PLAN</div>
          <span className="font-bold text-[14px] capitalize">{perfil.plan}</span>
        </section>
      )}

      <section className="tarjeta flex items-start justify-between gap-3">
        <div>
          <div className="titulo-tarjeta">COMUNIDAD</div>
          <p className="text-[13.5px] text-texto-2 leading-snug">
            Aparecer en la comunidad: otros clientes verán tu nombre cuando
            consigas un logro, y tu constancia en el ranking. Puedes
            desactivarlo cuando quieras.
          </p>
        </div>
        <Switch
          checked={visibleComunidad}
          onChange={cambiarVisibleComunidad}
          disabled={guardandoComunidad}
          label="Aparecer en la comunidad"
        />
      </section>

      <PreferenciasEjercicios
        clienteId={perfil.id}
        catalogo={biblioteca}
        excluidosIniciales={ejerciciosExcluidos}
      />

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
          {exportando ? "Preparando…" : <><Download size={14} className="inline mr-1.5 -mt-0.5" />Exportar mis datos (JSON)</>}
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

      <section className="tarjeta flex items-center justify-between">
        <span className="text-[14px] text-texto-2">¿Quieres cambiar de cuenta?</span>
        <BotonSalir />
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
