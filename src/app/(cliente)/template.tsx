/**
 * Se vuelve a montar en cada cambio de pantalla (a diferencia del
 * layout): así cada pantalla entra con un fundido corto en vez de
 * aparecer de golpe. Solo opacidad a propósito: un transform aquí
 * convertiría en relativos los elementos `fixed` de dentro (la barra
 * del descanso, el cuadro del chat) mientras dura la animación.
 */
export default function Plantilla({ children }: { children: React.ReactNode }) {
  return <div className="anim-pagina">{children}</div>;
}
