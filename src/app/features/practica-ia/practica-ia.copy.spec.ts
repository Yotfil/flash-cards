import {
  PRACTICA_IA_COPY,
  deletePackageMessage,
  hardCountLabel,
  itemsLabel,
  lastGradeLabel,
  practicedLabel,
  remainingLabel,
  todayLabel,
  todayRowLabel,
} from './practica-ia.copy';

describe('textos de la práctica con IA', () => {
  it('lo de hoy de un paquete', () => {
    expect(todayLabel(8, false)).toBe('8 para hoy');
    expect(todayLabel(3, true)).toBe('Ya practicaste hoy');
    expect(todayLabel(0, false)).toBe('Nada para hoy');
    expect(todayRowLabel('Película del viernes', 11)).toBe('Película del viernes · 11 para hoy');
  });

  it('ítems, capacidad y lo que cabe, con plural real', () => {
    expect(itemsLabel(14, 20)).toBe('14 / 20');
    expect(remainingLabel(2)).toBe('Caben 2 más en este paquete.');
    expect(remainingLabel(1)).toBe('Cabe 1 más en este paquete.');
  });

  it('el cierre de la práctica', () => {
    expect(practicedLabel(8)).toBe('Practicaste 8 ítems');
    expect(practicedLabel(1)).toBe('Practicaste 1 ítem');
    expect(hardCountLabel(5)).toBe('5 para reforzar con la IA');
    expect(hardCountLabel(0)).toBe('Ninguno difícil esta vez');
  });

  it('la última calificación de un ítem, con su día', () => {
    expect(lastGradeLabel(3, '2026-10-24', '2026-10-25')).toBe('Bien · ayer');
    expect(lastGradeLabel(1, '2026-10-25', '2026-10-25')).toBe('Otra vez · hoy');
    expect(lastGradeLabel(4, '2026-10-20', '2026-10-25')).toBe('Fácil · hace 5 días');
  });

  it('borrar un paquete nombra cuántos ítems se pierden', () => {
    expect(deletePackageMessage(3)).toBe('Se pierden sus 3 ítems. No se puede deshacer.');
    expect(deletePackageMessage(1)).toBe('Se pierde su único ítem. No se puede deshacer.');
    expect(deletePackageMessage(0)).toBe('No se puede deshacer.');
  });

  it('los textos son los de la spec', () => {
    const copy = PRACTICA_IA_COPY;
    expect(copy.sectionTitle).toBe('Práctica con IA');
    expect(copy.emptyInvite).toBe(
      'Guarda aquí las palabras y frases que te cruces en el día y practícalas con tu IA.',
    );
    expect(copy.newPackage).toBe('Nuevo paquete');
    expect(copy.completedLink).toBe('Paquetes completados');
    expect(copy.full).toBe('Este paquete está lleno.');
    expect(copy.practiceFirst).toBe('Practica primero para armar el prompt de hoy.');
    expect(copy.completeConfirm).toBe(
      '¿Ya te sabes todos los ítems de este paquete? Pasará al historial y dejará de practicarse.',
    );
    expect(copy.copied).toBe('Prompt copiado. Pégalo en tu chat de IA.');
    expect(copy.copyFailed).toBe(
      'No se pudo copiar automáticamente. Selecciona el texto y cópialo.',
    );
    expect(copy.loadError).toBe('No pudimos cargar tus paquetes.');
    expect(copy.noCompleted).toBe('Aún no has completado ningún paquete.');
    expect(copy.nothingPending).toBe('Nada pendiente en tus paquetes.');
    expect(copy.practicedAgain).toBe('Ya practicaste hoy · Volver a practicar');
    expect(copy.templateHint).toBe(
      'Usa [[REPASADAS]] y [[DIFICILES]] donde quieras que vayan tus términos.',
    );
    expect(copy.templateEmpty).toBe('La plantilla no puede estar vacía.');
    expect(copy.capacityRange).toBe('Entre 5 y 100, sin decimales.');
  });
});
