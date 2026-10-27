import { pluralize } from '@shared/text/pluralize';

// Textos de la importación (página "Importar un libro" y diálogo "Importar tarjetas"),
// centralizados (ADR 0002: copy por feature). Los motivos de cada línea omitida los da el parser.

export const IMPORTACION_COPY = {
  bookTitle: 'Importar un libro',
  bookIntro:
    'Pega el texto o carga un archivo .txt. Cada línea es una tarjeta: «anverso | reverso», o un texto con huecos {{así}}. Una línea que empieza por # abre un capítulo, y « :: » añade un ejemplo.',
  nameLabel: 'Nombre del libro',
  namePlaceholder: 'Libro importado',
  subjectLabel: 'Materia',
  subjectHint: 'Si la dejas vacía, será «general»',
  textLabel: 'Texto',
  textPlaceholder:
    '# Capítulo 1\nto give up | rendirse :: I gave up smoking.\nEl {{gato}} es negro',
  loadFile: 'Cargar archivo',
  readFileError: 'No se pudo leer el archivo.',
  importing: 'Importando…',
  cancel: 'Cancelar',
  bookError: 'No se pudo importar el libro. Inténtalo de nuevo.',
  cardsTitle: 'Importar tarjetas',
  cardsPlaceholder: 'to give up | rendirse :: I gave up smoking.\nEl {{gato}} es negro',
  modeQuestion: '¿Qué hacemos con las tarjetas que ya tiene el capítulo?',
  modeAppend: 'Agregar a las que ya existen',
  modeReplace: 'Reemplazar todas',
  cardsError: 'No se pudieron importar las tarjetas. Inténtalo de nuevo.',
  replaceTitle: '¿Reemplazar todas las tarjetas?',
  replaceConfirm: 'Reemplazar todo',
  replacing: 'Reemplazando…',
  repeatedNote: 'Se importarán igual. Las verás marcadas como repetidas.',
  chaptersTitle: 'Tarjetas por capítulo',
} as const;

export interface ImportCounts {
  readonly chapters: number;
  readonly cards: number;
  readonly repeated: number;
}

/** Cómo se nombra lo que entra: tarjetas en un libro, ítems en un paquete de práctica. */
export interface PreviewWording {
  readonly one: string;
  readonly many: string;
  readonly repeatedOne: string;
  readonly repeatedMany: string;
  readonly repeatedNote: string;
}

export const CARD_WORDING: PreviewWording = {
  one: 'tarjeta',
  many: 'tarjetas',
  repeatedOne: 'repetida',
  repeatedMany: 'repetidas',
  repeatedNote: IMPORTACION_COPY.repeatedNote,
};

/** "2 capítulos · 4 tarjetas · 1 repetida" (capítulos solo al importar un libro). */
export function countsLine(
  counts: ImportCounts,
  showChapters: boolean,
  wording: PreviewWording = CARD_WORDING,
): string {
  return [
    ...(showChapters ? [pluralize(counts.chapters, 'capítulo', 'capítulos')] : []),
    pluralize(counts.cards, wording.one, wording.many),
    ...(counts.repeated > 0
      ? [pluralize(counts.repeated, wording.repeatedOne, wording.repeatedMany)]
      : []),
  ].join(' · ');
}

/** "Unidad 1 · 24": un capítulo con su número de tarjetas, bajo "Tarjetas por capítulo". */
export function chapterCountLine(name: string, cards: number): string {
  return `${name} · ${cards}`;
}

export function omittedHeading(count: number): string {
  return count === 1 ? '1 línea se omitirá:' : `${count} líneas se omitirán:`;
}

export function omittedLine(line: number, reason: string): string {
  return `Línea ${line}: ${reason}`;
}

export function importLabel(count: number): string {
  return `Importar ${count}`;
}

/** El aviso de la confirmación de reemplazo. */
export function replaceWarning(count: number): string {
  const what =
    count === 1
      ? 'Se borrará la tarjeta actual del capítulo'
      : `Se borrarán las ${count} tarjetas actuales del capítulo`;
  return `${what}, junto con su historial y progreso de estudio. Si quieres conservar el progreso, cambia cada tarjeta con «Editar».`;
}
