/** Forma comparable de un texto de tarjeta: sin espacios de sobra y en minúsculas. */
export function normalizeCardText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}
