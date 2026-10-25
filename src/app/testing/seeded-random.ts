/**
 * Fuente de aleatoriedad determinista (mulberry32) para pruebas: la misma semilla da siempre la
 * misma secuencia, así un barajado se puede afirmar sin fingir `Math.random`.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
