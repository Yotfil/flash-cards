// Parser de la convención de importación (spec §5): texto plano → capítulos y tarjetas, con un
// reporte de líneas problemáticas. Es código PURO (sin Angular ni Firestore): el "cerebro" que se
// prueba a fondo. Lo usan tanto "pegar tarjetas en un capítulo" como "importar un libro".
//
// Regla de oro (§5.4): NINGUNA línea mala aborta la importación; se procesa todo lo válido y se
// devuelven los errores con su número de línea (1-based) para mostrarlos en la previsualización.

export interface ParsedCard {
  front: string;
  back: string;
}

export interface ParsedChapter {
  name: string;
  cards: ParsedCard[];
}

export interface ParseError {
  /** Número de línea (1-based) donde está el problema. */
  line: number;
  reason: string;
}

export interface ParseResult {
  chapters: ParsedChapter[];
  errors: ParseError[];
  validCardCount: number;
}

const CHAPTER_PREFIX = '#';
const PIPE = '|';
const TAB = '\t';

/**
 * Parte una línea de tarjeta en anverso/reverso por el primer separador (§5.3): `|` si existe; si
 * no, un tabulador. Devuelve null si la línea no tiene ninguno de los dos (línea inválida).
 */
function splitCardLine(line: string): ParsedCard | null {
  const separatorIndex = line.includes(PIPE) ? line.indexOf(PIPE) : line.indexOf(TAB);
  if (separatorIndex === -1) {
    return null;
  }
  // Se parte sólo en el primer separador: el reverso puede contener más pipes (§5.3).
  const front = line.slice(0, separatorIndex).trim();
  const back = line.slice(separatorIndex + 1).trim();
  return { front, back };
}

/**
 * Procesa el texto según la convención de §5. `defaultChapterName` es el nombre del capítulo donde
 * caen las tarjetas que aparecen antes del primer `#` (o si el texto no tiene ningún `#`): para
 * importar un libro es el nombre del libro; para pegar en un capítulo, el nombre del capítulo.
 */
export function parseFlashcards(text: string, defaultChapterName: string): ParseResult {
  const chapters: ParsedChapter[] = [];
  const errors: ParseError[] = [];

  // Capítulo activo. Se crea de forma perezosa: el capítulo por defecto sólo existe si llega a
  // recibir alguna tarjeta (no inventamos un capítulo vacío si el archivo arranca con `#`).
  let currentChapter: ParsedChapter | null = null;

  function chapterForCards(): ParsedChapter {
    if (currentChapter === null) {
      currentChapter = { name: defaultChapterName, cards: [] };
      chapters.push(currentChapter);
    }
    return currentChapter;
  }

  const lines = text.split(/\r\n|\r|\n/);
  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();

    if (line === '') {
      return; // Línea en blanco: se ignora por completo (§5.2).
    }

    if (line.startsWith(CHAPTER_PREFIX)) {
      const name = line.slice(CHAPTER_PREFIX.length).trim();
      if (name === '') {
        errors.push({ line: lineNumber, reason: 'Encabezado de capítulo sin nombre.' });
        return;
      }
      currentChapter = { name, cards: [] };
      chapters.push(currentChapter);
      return;
    }

    const card = splitCardLine(line);
    if (card === null) {
      errors.push({ line: lineNumber, reason: 'Línea sin separador ("|" o tabulador).' });
      return;
    }
    if (card.front === '' || card.back === '') {
      errors.push({ line: lineNumber, reason: 'Anverso o reverso vacío.' });
      return;
    }
    chapterForCards().cards.push(card);
  });

  const validCardCount = chapters.reduce((total, chapter) => total + chapter.cards.length, 0);
  return { chapters, errors, validCardCount };
}
