import type { Card } from '@domain/models/card.model';
import type { Chapter } from '@domain/models/chapter.model';
import { BOOK_FORM_MESSAGES } from '@services/books/book-form.schema';
import { CARD_FORM_MESSAGES } from '@services/cards/card-form.schema';
import { clozeQuestion } from '@services/cards/cloze/parse-cloze';
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
    nameRequired: BOOK_FORM_MESSAGES.nameRequired,
    nameTooLong: BOOK_FORM_MESSAGES.nameTooLong,
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
  cardForm: {
    createTitle: 'Nueva tarjeta',
    editTitle: 'Editar tarjeta',
    typeLabel: 'Tipo',
    basic: 'Básica',
    cloze: 'Cloze (rellenar el hueco)',
    frontLabel: 'Anverso',
    backLabel: 'Reverso',
    clozeLabel: 'Texto con huecos',
    clozeHint: 'Marca lo que quieras ocultar con {{…}}. Ej.: El {{gato}} es negro.',
    frontRequired: CARD_FORM_MESSAGES.frontRequired,
    backRequired: CARD_FORM_MESSAGES.backRequired,
    clozeRequired: CARD_FORM_MESSAGES.clozeRequired,
    tooLong: CARD_FORM_MESSAGES.tooLong,
    moreOptions: 'Más opciones',
    exampleLabel: 'Ejemplo',
    duplicate: 'Ya tienes una tarjeta igual en este capítulo.',
    create: 'Crear tarjeta',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    saveError: 'No se pudo guardar la tarjeta. Inténtalo de nuevo.',
  },
  cardList: {
    loadError: 'No pudimos cargar las tarjetas',
    loadErrorMessage: 'Revisa tu conexión e inténtalo de nuevo.',
    emptyTitle: 'Este capítulo aún no tiene tarjetas',
    emptyMessage: 'Escribe una o pega varias de golpe.',
    create: 'Crear tarjeta',
    import: 'Importar tarjetas',
    newCard: 'Nueva tarjeta',
    select: 'Seleccionar',
    selectAll: 'Seleccionar todas',
    cancelSelection: 'Cancelar selección',
    deleteSelected: 'Eliminar',
    selectedCount: (count: number) => pluralize(count, 'seleccionada', 'seleccionadas'),
  },
  deleteCard: {
    title: '¿Borrar esta tarjeta?',
    detail: 'Se pierde su progreso de estudio. No se puede deshacer.',
    confirm: 'Borrar',
    pending: 'Borrando…',
    error: 'No se pudo borrar la tarjeta. Inténtalo de nuevo.',
  },
  deleteCards: {
    title: '¿Borrar las tarjetas seleccionadas?',
    pending: 'Borrando…',
    error: 'No se pudieron borrar las tarjetas seleccionadas. Inténtalo de nuevo.',
  },
  cardRow: {
    arrow: '→',
    cloze: 'cloze',
    duplicate: 'Repetida',
    duplicateLabel: 'Tarjeta repetida',
    suspended: 'Suspendida',
    hasExample: 'Tiene ejemplo',
    actionsOf: (name: string) => `Acciones de «${name}»`,
    selectOf: (name: string) => `Seleccionar «${name}»`,
    edit: 'Editar',
    suspend: 'Suspender',
    reactivate: 'Reactivar',
    delete: 'Borrar',
  },
  study: {
    book: 'Estudiar este libro',
    chapter: 'Estudiar este capítulo',
    bookSettled: 'Estás al día con este libro. No hay tarjetas para repasar ahora.',
    chapterSettled: 'Estás al día con este capítulo. No hay tarjetas para repasar ahora.',
    error: 'No se pudo preparar la sesión. Inténtalo de nuevo.',
  },
  importCards: 'Importar tarjetas',
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

/** Tarjetas listas de un capítulo (sin topes): "22 listas", "1 lista" o "al día". */
export function chapterReadyLabel(ready: number): string {
  return ready === 0 ? 'al día' : pluralize(ready, 'lista', 'listas');
}

/** Cómo se nombra una tarjeta en menús y confirmaciones: su anverso, o la pregunta si es cloze. */
export function cardDisplayName(card: Card): string {
  return card.cardType === 'cloze' ? clozeQuestion(card.front) : card.front;
}

/** Mensaje de la confirmación del borrado masivo de tarjetas, con el verbo concordado. */
export function bulkDeletionMessage(count: number): string {
  const verb = count === 1 ? 'Se eliminará' : 'Se eliminarán';
  const cards = pluralize(count, 'tarjeta', 'tarjetas');
  return `${verb} ${cards} de este capítulo, con su progreso de estudio. ${CANNOT_UNDO}`;
}

/** Botón de confirmación del borrado masivo: dice cuántas. */
export function bulkDeleteLabel(count: number): string {
  return `Borrar ${count}`;
}
