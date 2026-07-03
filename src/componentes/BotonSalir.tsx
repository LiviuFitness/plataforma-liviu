"use client";

import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

/** Cierra la sesión y vuelve al login. */
export default function BotonSalir() {
  const router = useRouter();
  async function salir() {
    const supabase = crearClienteNavegador();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button className="ghost" onClick={salir}>
      Salir
    </button>
  );
}
