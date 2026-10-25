// La calificación de un repaso: 1 = Otra vez, 2 = Difícil, 3 = Bien, 4 = Fácil. Es lo único que
// emite la fila de cerebros; el algoritmo decide qué significa.
export type Rating = 1 | 2 | 3 | 4;

/** Los cuatro grados en orden, para recorrerlos sin repetir la lista. */
export const RATINGS: readonly Rating[] = [1, 2, 3, 4];
