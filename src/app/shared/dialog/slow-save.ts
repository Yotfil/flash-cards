/**
 * Cuánto espera un guardado antes de admitir que no confirma. Con un wifi sin internet, Firestore
 * guarda en el dispositivo al instante pero no confirma hasta que vuelve la red: pasado este
 * plazo, la pantalla lo dice y deja de bloquear al usuario.
 */
export const SLOW_SAVE_MS = 6000;

/** Llama a `onSlow` si pasa el plazo; devuelve cómo cancelarlo (al terminar o al cerrar). */
export function watchSlow(onSlow: () => void, delayMs = SLOW_SAVE_MS): () => void {
  const timer = setTimeout(onSlow, delayMs);
  return () => clearTimeout(timer);
}
