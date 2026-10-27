import {
  BIBLIOTECA_COPY,
  bookDeletionDetail,
  bulkDeleteLabel,
  bulkDeletionMessage,
  cardDisplayName,
  chapterDeletionDetail,
  chapterReadyLabel,
  chapterDisplayName,
  COPIED,
  EXPORT_ACTIONS,
  EXPORT_COPY_ERROR,
  EXPORT_ERROR,
  EXPORT_NEEDS_CONNECTION,
  EXPORT_READ_ERROR,
  exportButtonLabel,
  exportDialogTitle,
  exportSummary,
  wontReturnHeading,
} from './biblioteca.copy';
import { aCard } from '@testing/fake-card-repository';
import { aChapter } from '@testing/fake-chapter-repository';

describe('textos de la Biblioteca', () => {
  it('el detalle del borrado nombra cuántos capítulos y tarjetas se van', () => {
    expect(bookDeletionDetail({ chapters: 3, cards: 40 })).toBe(
      'Se borrarán 3 capítulos y 40 tarjetas. Tu historial de repasos se conserva.',
    );
  });

  it('usa el singular cuando toca', () => {
    expect(bookDeletionDetail({ chapters: 1, cards: 1 })).toBe(
      'Se borrarán 1 capítulo y 1 tarjeta. Tu historial de repasos se conserva.',
    );
  });

  it('sin conteos lo dice sin números', () => {
    expect(bookDeletionDetail(null)).toBe(
      'También se borrarán sus capítulos y tarjetas. Tu historial de repasos se conserva.',
    );
  });

  it('el número de tarjetas de un libro usa plural real', () => {
    expect([0, 1, 12].map(BIBLIOTECA_COPY.cards)).toEqual([
      '0 tarjetas',
      '1 tarjeta',
      '12 tarjetas',
    ]);
  });

  it.each([
    [42, 'Se borrarán 42 tarjetas. Tu historial de repasos se conserva. No se puede deshacer.'],
    [1, 'Se borrará 1 tarjeta. Tu historial de repasos se conserva. No se puede deshacer.'],
    [0, 'No se puede deshacer.'],
    [
      null,
      'También se borrarán sus tarjetas. Tu historial de repasos se conserva. No se puede deshacer.',
    ],
  ])('el detalle del borrado de un capítulo con %s tarjetas concuerda el verbo', (count, text) => {
    expect(chapterDeletionDetail(count)).toBe(text);
  });

  it('un capítulo sin nombre se pinta como "Capítulo sin nombre"', () => {
    expect(chapterDisplayName(aChapter({ name: '' }))).toBe('Capítulo sin nombre');
    expect(chapterDisplayName(aChapter({ name: 'Básicos' }))).toBe('Básicos');
  });

  it('el borrado masivo concuerda el verbo y nombra cuántas en el botón', () => {
    expect(bulkDeletionMessage(1)).toBe(
      'Se eliminará 1 tarjeta de este capítulo, con su progreso de estudio. No se puede deshacer.',
    );
    expect(bulkDeletionMessage(4)).toBe(
      'Se eliminarán 4 tarjetas de este capítulo, con su progreso de estudio. No se puede deshacer.',
    );
    expect(bulkDeleteLabel(4)).toBe('Borrar 4');
  });

  it('una tarjeta se nombra por su anverso, o por su pregunta compacta si es cloze', () => {
    expect(cardDisplayName(aCard({ front: 'to give up' }))).toBe('to give up');
    expect(cardDisplayName(aCard({ cardType: 'cloze', front: 'El {{gato}} es negro' }))).toBe(
      'El […] es negro',
    );
  });

  it('las listas de un capítulo con plural real, o "al día" si no hay', () => {
    expect(chapterReadyLabel(22)).toBe('22 listas');
    expect(chapterReadyLabel(1)).toBe('1 lista');
    expect(chapterReadyLabel(0)).toBe('al día');
  });

  it('la exportación resume con plural real y nombra el libro en el botón y el título', () => {
    expect(exportSummary(2, 40)).toBe('2 capítulos · 40 tarjetas');
    expect(exportSummary(1, 1)).toBe('1 capítulo · 1 tarjeta');
    expect(exportButtonLabel('Phrasal Verbs')).toBe('Exportar «Phrasal Verbs»');
    expect(exportDialogTitle('Phrasal Verbs')).toBe('Exportar «Phrasal Verbs»');
  });

  it('el aviso de las tarjetas que no volverán igual concuerda en número', () => {
    expect(wontReturnHeading(1)).toBe('1 tarjeta no volverá igual al importarla:');
    expect(wontReturnHeading(3)).toBe('3 tarjetas no volverán igual al importarlas:');
  });

  it('los textos de la exportación son los de la spec', () => {
    expect(EXPORT_READ_ERROR).toBe('No pudimos cargar las tarjetas del libro.');
    expect(EXPORT_ERROR).toBe('No se pudo exportar el libro. Inténtalo de nuevo.');
    expect(EXPORT_COPY_ERROR).toBe('No se pudo copiar. Usa «Descargar .txt».');
    expect(EXPORT_NEEDS_CONNECTION).toBe('Necesitas conexión para exportar.');
    expect(COPIED).toBe('Copiado');
    expect(EXPORT_ACTIONS).toEqual({
      share: 'Compartir',
      download: 'Descargar .txt',
      copy: 'Copiar texto',
      retry: 'Reintentar',
      cancel: 'Cancelar',
    });
  });
});
