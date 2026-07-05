import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* Rutas accesibles sin sesión */
const RUTAS_PUBLICAS = [
  "/login",
  "/recuperar",
  "/restablecer",
  "/alta",
  "/auth", // callback de OAuth (Google)
  "/aviso-legal",
  "/politica-privacidad",
  "/politica-cookies",
  "/terminos",
  "/opengraph-image", // miniatura al compartir el enlace (sin extensión en la URL, la genera Next)
];

function esRutaPublica(ruta: string) {
  return RUTAS_PUBLICAS.some((r) => ruta === r || ruta.startsWith(r + "/"));
}

/**
 * Proxy de autenticación: refresca la sesión de Supabase en cada petición
 * y redirige a /login cuando no hay usuario en rutas privadas.
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesAEstablecer) {
          cookiesAEstablecer.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          respuesta = NextResponse.next({ request });
          cookiesAEstablecer.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Importante: no ejecutar lógica entre createServerClient y getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;

  if (!user && !esRutaPublica(ruta)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && ruta === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/hoy";
    return NextResponse.redirect(url);
  }

  return respuesta;
}

export const config = {
  matcher: [
    // Todo excepto estáticos, imágenes y ficheros públicos
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icono.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
