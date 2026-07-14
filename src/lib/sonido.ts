/** Avisos sonoros cortos generados con Web Audio (sin archivos que
 * cargar). A diferencia de la Vibration API, esto SÍ funciona en
 * iOS/Safari — pero solo si el AudioContext se desbloqueó antes dentro
 * de un gesto real del usuario (por eso `desbloquear()` se llama en el
 * primer toque de la sesión, no en el propio timer). */

let ctx: AudioContext | null = null;

export function desbloquear() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume();
    return;
  }
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  try {
    ctx = new Ctor();
  } catch {
    /* Web Audio no disponible: los pitidos simplemente no sonarán */
  }
}

function tono(frecuencia: number, inicio: number, duracion: number, volumen = 0.16) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frecuencia;
  gain.gain.setValueAtTime(0, ctx.currentTime + inicio);
  gain.gain.linearRampToValueAtTime(volumen, ctx.currentTime + inicio + 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + inicio + duracion);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + inicio);
  osc.stop(ctx.currentTime + inicio + duracion + 0.02);
}

/** Dos tonos ascendentes cortos — fin del descanso. */
export function pitarDescansoTerminado() {
  tono(660, 0, 0.12);
  tono(880, 0.13, 0.16);
}

/** Acorde corto de tres notas — nuevo récord. */
export function pitarRecord() {
  tono(523.25, 0, 0.14);
  tono(659.25, 0.05, 0.14);
  tono(783.99, 0.1, 0.22);
}
