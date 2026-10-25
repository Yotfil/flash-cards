import type { Chapter } from '@domain/models/chapter.model';
import { pluralize } from '@shared/text/pluralize';

// Textos de la Biblioteca y del detalle de libro, centralizados (ADR 0002: copy por feature).

export const BIBLIOTECA_COPY = {
  title: 'Biblioteca',
  newBook: 'Nuevo libro',
  createBook: 'Crear libro',
  importBook: 'Importar libro',
  loadError: 'No pudimos cargar tus libros',
  loadErrorMessage: 'Revisa tu conexión e inténtalo de nuevo.',
  emptyTitle: 'Aún no tienes libros',
  emptyMessage: 'Crea el primero o importa uno que ya tengas.',
  cards: (count: number) => pluralize(count, 'tarjeta', 'tarjetas'),
  newPerDay: (count: number) => `${count} nuevas al día`,
  settingsOf: (name: string) => `Ajustes de ${name}`,
  deleteOf: (name: string) => `Borrar ${name}`,
  editOf: (name: string) => `Editar ${name}`,
  bookForm: {
    createTitle: 'Nuevo libro',
    editTitle: 'Editar libro',
    nameLabel: 'Nombre',
    nameRequired: 'El nombre es obligatorio.',
    nameTooLong: 'Usa como máximo 120 caracteres.',
    subjectLabel: 'Materia',
    subjectHint: 'Si la dejas vacía, será «general»',
    create: 'Crear libro',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    saveError: 'No se pudo guardar el libro. Inténtalo de nuevo.',
  },
  bookSettings: {
    title: (name: string) => `Ajustes de «${name}»`,
    newCardsLabel: 'Nuevas por día',
    newCardsInvalid: 'Escribe un número entero entre 0 y 999.',
    maxReviewsLabel: 'Máx. repasos/día',
    maxReviewsInvalid: 'Escribe un número entero entre 0 y 9999.',
    noLimitHint: '0 = sin tope',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    saveError: 'No se pudieron guardar los ajustes. Inténtalo de nuevo.',
  },
  deleteBook: {
    title: '¿Borrar este libro?',
    message: (name: string) => `Vas a borrar «${name}». No se puede deshacer.`,
    confirm: 'Borrar',
    pending: 'Borrando…',
    error: 'No se pudo borrar el libro. Inténtalo de nuevo.',
  },
  chapterForm: {
    createTitle: 'Nuevo capítulo',
    renameTitle: 'Renombrar capítulo',
    nameLabel: 'Nombre',
    namePlaceholder: 'Ej. Unidad 1',
    create: 'Crear capítulo',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    saveError: 'No se pudo guardar el capítulo. Inténtalo de nuevo.',
  },
  chapters: {
    heading: 'Capítulos',
    loadError: 'No pudimos cargar los capítulos',
    loadErrorMessage: 'Revisa tu conexión e inténtalo de nuevo.',
    emptyTitle: 'Este libro aún no tiene capítulos',
    emptyMessage: 'Los capítulos agrupan tus tarjetas. Crea el primero para empezar.',
    create: 'Crear capítulo',
    add: 'Añadir un capítulo',
    renameOf: (name: string) => `Renombrar ${name}`,
    deleteOf: (name: string) => `Borrar ${name}`,
  },
  deleteChapter: {
    title: '¿Borrar este capítulo?',
    message: (name: string) => `Se borrará «${name}».`,
    confirm: 'Borrar',
    pending: 'Borrando…',
    error: 'No se pudo borrar el capítulo. Inténtalo de nuevo.',
  },
  chapterDetail: {
    backTo: (bookName: string) => `Volver a ${bookName}`,
    notFoundTitle: 'Capítulo no encontrado',
    notFoundMessage: 'Vuelve al libro para ver sus capítulos.',
    cards: 'Tarjetas',
  },
  detail: {
    back: '← Biblioteca',
    notFoundTitle: 'Libro no encontrado',
    notFoundMessage: 'Puede que se haya borrado. Vuelve a la Biblioteca para elegir otro.',
    backToLibrary: 'Ir a la Biblioteca',
    chapters: 'Capítulos',
    mastered: 'dominadas',
    learning: 'en aprendizaje',
    newCards: 'nuevas',
  },
} as const;

/** Detalle de la confirmación de borrado: con conteos si se conocen, si no, sin números. */
export function bookDeletionDetail(counts: { chapters: number; cards: number } | null): string {
  if (counts === null) {
    return 'También se borrarán sus capítulos y tarjetas. Tu historial de repasos se conserva.';
  }
  const chapters = pluralize(counts.chapters, 'capítulo', 'capítulos');
  const cards = pluralize(counts.cards, 'tarjeta', 'tarjetas');
  return `Se borrarán ${chapters} y ${cards}. Tu historial de repasos se conserva.`;
}

const KEEPS_HISTORY = 'Tu historial de repasos se conserva.';
const CANNOT_UNDO = 'No se puede deshacer.';

/** Detalle del borrado de un capítulo, con el verbo concordado ("Se borrará 1 tarjeta"). */
export function chapterDeletionDetail(cards: number | null): string {
  if (cards === null) {
    return `También se borrarán sus tarjetas. ${KEEPS_HISTORY} ${CANNOT_UNDO}`;
  }
  if (cards === 0) {
    return CANNOT_UNDO;
  }
  const verb = cards === 1 ? 'Se borrará' : 'Se borrarán';
  return `${verb} ${pluralize(cards, 'tarjeta', 'tarjetas')}. ${KEEPS_HISTORY} ${CANNOT_UNDO}`;
}

/** Los capítulos de versiones anteriores pueden no tener nombre. */
export function chapterDisplayName(chapter: Chapter): string {
  return chapter.name.trim() || 'Capítulo sin nombre';
}
