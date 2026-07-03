export const metadata = {
  title: "Política de privacidad — LIVIU Fitness Studio",
};

export default function PoliticaPrivacidad() {
  return (
    <>
      <h1>Política de privacidad</h1>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>Responsable: [NOMBRE Y APELLIDOS DE LIVIU / DENOMINACIÓN SOCIAL]</li>
        <li>NIF: [NIF]</li>
        <li>Domicilio: [DIRECCIÓN COMPLETA]</li>
        <li>Email: [EMAIL DE CONTACTO PARA PROTECCIÓN DE DATOS]</li>
      </ul>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>
          <b>Datos identificativos:</b> nombre, apellidos y email.
        </li>
        <li>
          <b>Datos de salud (categoría especial, art. 9 RGPD):</b> peso,
          medidas corporales, registros de entrenamiento, pautas y registros de
          alimentación, sensaciones tras el ejercicio y, si las aportas, fotos
          de progreso.
        </li>
        <li>
          <b>Datos técnicos:</b> los estrictamente necesarios para mantener la
          sesión iniciada (cookies técnicas).
        </li>
      </ul>

      <h2>3. Finalidad y base jurídica</h2>
      <p>
        Tratamos tus datos con una única finalidad: el seguimiento deportivo y
        nutricional que contratas con LIVIU Fitness Studio. La base jurídica es
        doble:
      </p>
      <ul>
        <li>
          La <b>ejecución del contrato</b> de servicios de entrenamiento (art.
          6.1.b RGPD) para los datos identificativos.
        </li>
        <li>
          Tu <b>consentimiento explícito</b> (art. 9.2.a RGPD) para los datos
          de salud, que prestas al crear tu cuenta marcando la casilla
          correspondiente. Guardamos la fecha y hora de ese consentimiento.
          Puedes retirarlo en cualquier momento; sin él no es posible prestar
          el servicio de seguimiento.
        </li>
      </ul>

      <h2>4. Cuánto tiempo conservamos los datos</h2>
      <p>
        Mientras dure la relación contractual. Al finalizar, tus datos se
        conservarán bloqueados durante los plazos de prescripción legal
        ([PLAZO, p. ej. 5 años]) y después se eliminarán o anonimizarán.
      </p>

      <h2>5. A quién comunicamos tus datos</h2>
      <p>
        No vendemos ni cedemos tus datos. Solo los tratan nuestros proveedores
        técnicos, con contratos de encargo de tratamiento (art. 28 RGPD):
      </p>
      <ul>
        <li>
          <b>Supabase</b> (base de datos y autenticación), con alojamiento en
          la Unión Europea ([FRANKFURT/PARÍS]).
        </li>
        <li>
          <b>Vercel</b> (alojamiento de la aplicación web).
        </li>
      </ul>
      <p>No se utilizan herramientas de analítica de terceros ni píxeles publicitarios.</p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes ejercer en cualquier momento tus derechos de acceso,
        rectificación, supresión, oposición, limitación y portabilidad
        escribiendo a [EMAIL]. Desde tu perfil también podrás exportar tus
        datos y solicitar la eliminación de tu cuenta. Si consideras que el
        tratamiento no es adecuado, puedes reclamar ante la Agencia Española de
        Protección de Datos (www.aepd.es).
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas apropiadas: acceso mediante
        contraseña, cifrado de las comunicaciones (HTTPS), aislamiento de los
        datos de cada cliente mediante políticas de seguridad a nivel de fila y
        almacenamiento privado de las fotos de progreso.
      </p>
    </>
  );
}
