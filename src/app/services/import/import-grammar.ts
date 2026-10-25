// La gramática del texto de importación ("un archivo = un libro"). La exportación escribe con
// estas mismas constantes, así lo que se exporta se vuelve a importar igual.

/** Una línea que empieza así abre un capítulo. */
export const CHAPTER_PREFIX = '#';
/** Separa anverso y reverso (tiene prioridad sobre el tabulador). */
export const PIPE = '|';
export const TAB = '\t';
/** Separa el ejemplo opcional: dos puntos dobles con espacio a cada lado. */
export const EXAMPLE_SEPARATOR = ' :: ';
/** Saltos de línea de cualquier sistema. */
export const LINE_BREAK = /\r\n|\r|\n/;
