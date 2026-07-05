/* Frases motivacionales para la pantalla de Inicio del cliente.
   Cambia una vez al día (determinista, no en cada recarga). */
const FRASES = [
  "El gimnasio no construye campeones, los revela.",
  "No cuentan los días, cuenta lo que haces en ellos.",
  "La disciplina pesa gramos; el arrepentimiento, toneladas.",
  "Cada serie de hoy es el resultado de mañana.",
  "No busques motivación, busca constancia.",
  "El cuerpo logra lo que la mente cree posible.",
  "Un entreno más, una excusa menos.",
  "La comodidad es el enemigo del progreso.",
  "Progreso, no perfección.",
  "Hoy entrenas por el tú del futuro.",
];

export function fraseDelDia(): string {
  const dia = Math.floor(Date.now() / 86400000);
  return FRASES[dia % FRASES.length];
}

export function saludoSegunHora(): string {
  const hora = new Date().getHours();
  if (hora < 6) return "Buenas noches";
  if (hora < 13) return "Buenos días";
  if (hora < 21) return "Buenas tardes";
  return "Buenas noches";
}
