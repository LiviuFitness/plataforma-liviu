import { redirect } from "next/navigation";

/** La raíz redirige al panel. El proxy se encarga de mandar a /login si no hay sesión. */
export default function Inicio() {
  redirect("/hoy");
}
