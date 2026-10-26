/** Ancho de una barra a partir de su parte (0 a 1), con un decimal: "14.3%", "30%". */
export function barWidth(share: number): string {
  return `${Math.round(share * 1000) / 10}%`;
}
