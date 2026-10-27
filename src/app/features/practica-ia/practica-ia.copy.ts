import type { Rating } from '@domain/models/rating';
import { pluralize } from '@shared/text/pluralize';

import { REPASO_COPY } from '../repaso/repaso.copy';

// Textos de la práctica con IA (paquetes), centralizados (ADR 0002: copy por feature).
export const PRACTICA_IA_COPY = {
  sectionTitle: 'Práctica con IA',
  emptyInvite: 'Guarda aquí las palabras y frases que te cruces en el día y practícalas con tu IA.',
  newPackage: 'Nuevo paquete',
  completedLink: 'Paquetes completados',
  completedTitle: 'Paquetes completados',
  noCompleted: 'Aún no has completado ningún paquete.',
  loadError: 'No pudimos cargar tus paquetes.',
  retry: 'Reintentar',
  backToLibrary: '← Biblioteca',
  notFoundTitle: 'Paquete no encontrado',
  notFoundMessage: 'Puede que se haya borrado. Vuelve a la Biblioteca para elegir otro.',
  forToday: 'Para hoy',
  practiceToday: 'Practicar hoy',
  practiceAgain: 'Volver a practicar',
  nothingToday: 'Nada para hoy.',
  practiceError: 'No se pudo preparar la práctica. Inténtalo de nuevo.',
  add: 'Agregar',
  import: 'Importar',
  importTitle: 'Importar ítems',
  importError: 'No se pudieron agregar los ítems. Inténtalo de nuevo.',
  packageCompleted: 'Este paquete ya está completado; no admite más ítems.',
  itemFormCreate: 'Nuevo ítem',
  duplicate: 'Ya tienes un ítem igual en este paquete.',
  full: 'Este paquete está lleno.',
  copyTodayPrompt: 'Copiar prompt de hoy',
  copyPrompt: 'Copiar prompt',
  practiceFirst: 'Practica primero para armar el prompt de hoy.',
  copied: 'Prompt copiado. Pégalo en tu chat de IA.',
  copyFailed: 'No se pudo copiar automáticamente. Selecciona el texto y cópialo.',
  promptLabel: 'Prompt de hoy',
  complete: 'Marcar como completado',
  completeTitle: 'Marcar como completado',
  completeConfirm:
    '¿Ya te sabes todos los ítems de este paquete? Pasará al historial y dejará de practicarse.',
  completing: 'Guardando…',
  completeError: 'No se pudo completar el paquete. Inténtalo de nuevo.',
  completedOn: (date: string) => `Completado el ${date}`,
  actionsOf: (name: string) => `Acciones de «${name}»`,
  itemActionsOf: (front: string) => `Acciones de «${front}»`,
  rename: 'Renombrar',
  delete: 'Borrar',
  edit: 'Editar',
  deleteTitle: '¿Borrar este paquete?',
  deleteConfirm: 'Borrar',
  deleting: 'Borrando…',
  deleteError: 'No se pudo borrar el paquete. Inténtalo de nuevo.',
  deleteItemTitle: '¿Borrar este ítem?',
  deleteItemMessage: 'No se puede deshacer.',
  deleteItemError: 'No se pudo borrar el ítem. Inténtalo de nuevo.',
  packageForm: {
    createTitle: 'Nuevo paquete',
    renameTitle: 'Renombrar paquete',
    nameLabel: 'Nombre',
    create: 'Crear paquete',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    saveError: 'No se pudo guardar el paquete. Inténtalo de nuevo.',
  },
  emptyItems: 'Este paquete aún no tiene ítems. Agrega uno o pega varios.',
  todayBlockTitle: 'Práctica con IA',
  nothingPending: 'Nada pendiente en tus paquetes.',
  seePackages: 'Ver paquetes',
  practicedAgain: 'Ya practicaste hoy · Volver a practicar',
  practiceFinished: 'Práctica terminada',
  packageGoneTitle: 'Este paquete ya no existe',
  packageGoneMessage: 'Se borró en otro dispositivo, así que esta práctica ya no se puede guardar.',
  backToPackage: 'Volver al paquete',
  settingsTitle: 'Práctica con IA',
  templateLabel: 'Plantilla del prompt',
  templateHint: 'Usa [[REPASADAS]] y [[DIFICILES]] donde quieras que vayan tus términos.',
  restoreTemplate: 'Restaurar plantilla por defecto',
  capacityLabel: 'Ítems por paquete',
  templateEmpty: 'La plantilla no puede estar vacía.',
  capacityRange: 'Entre 5 y 100, sin decimales.',
} as const;

/** Lo de hoy en la fila de un paquete. */
export function todayLabel(pending: number, practicedToday: boolean): string {
  if (practicedToday) {
    return 'Ya practicaste hoy';
  }
  return pending === 0 ? 'Nada para hoy' : `${pending} para hoy`;
}

/** La fila de Hoy: "Película del viernes · 11 para hoy". */
export function todayRowLabel(name: string, pending: number): string {
  return `${name} · ${pending} para hoy`;
}

/** "14 / 20": ítems sobre la capacidad del paquete. */
export function itemsLabel(count: number, capacity: number): string {
  return `${count} / ${capacity}`;
}

export function itemCountLabel(count: number): string {
  return pluralize(count, 'ítem', 'ítems');
}

export function remainingLabel(count: number): string {
  return `${count === 1 ? 'Cabe' : 'Caben'} ${count} más en este paquete.`;
}

export function practicedLabel(count: number): string {
  return `Practicaste ${pluralize(count, 'ítem', 'ítems')}`;
}

export function hardCountLabel(count: number): string {
  return count === 0 ? 'Ninguno difícil esta vez' : `${count} para reforzar con la IA`;
}

export function deletePackageMessage(items: number): string {
  if (items === 0) {
    return 'No se puede deshacer.';
  }
  const lost = items === 1 ? 'Se pierde su único ítem.' : `Se pierden sus ${items} ítems.`;
  return `${lost} No se puede deshacer.`;
}

/** "Bien · ayer": la última nota de un ítem y cuándo fue. */
export function lastGradeLabel(grade: Rating, dayId: string, todayId: string): string {
  return `${REPASO_COPY.ratingLabels[grade]} · ${daysAgoLabel(daysBetween(dayId, todayId))}`;
}

function daysAgoLabel(days: number): string {
  if (days <= 0) {
    return 'hoy';
  }
  return days === 1 ? 'ayer' : `hace ${days} días`;
}

const DAY_MS = 86_400_000;

/** Días entre dos ids de día "YYYY-MM-DD" (fechas de calendario, sin zona horaria). */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}
