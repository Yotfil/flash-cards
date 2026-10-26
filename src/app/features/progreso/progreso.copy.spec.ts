import { PROGRESO_COPY, collectionBarLabel, collectionTotal } from './progreso.copy';

describe('textos de Progreso', () => {
  it('el total de la colección con plural real', () => {
    expect(collectionTotal(1)).toBe('1 tarjeta en total');
    expect(collectionTotal(10)).toBe('10 tarjetas en total');
  });

  it('los textos son los de la spec', () => {
    expect(PROGRESO_COPY.emptyTitle).toBe('Aún no hay nada que mostrar');
    expect(PROGRESO_COPY.emptyMessage).toBe(
      'Tus estadísticas aparecerán aquí en cuanto agregues tarjetas y empieces a repasar.',
    );
    expect(PROGRESO_COPY.errorTitle).toBe('No pudimos cargar tus estadísticas');
    expect(PROGRESO_COPY.errorMessage).toBe('No se pudieron cargar tus estadísticas.');
    expect(PROGRESO_COPY.collectionOffline).toBe('Necesitas conexión para contar tu colección.');
    expect(PROGRESO_COPY.collectionError).toBe('No pudimos contar tu colección.');
    expect(PROGRESO_COPY.noRatingsToday).toBe('Aún no has calificado tarjetas hoy.');
  });

  it('la barra apilada se lee con los tres conteos', () => {
    expect(collectionBarLabel(3, 2, 5)).toBe('3 nuevas, 2 en aprendizaje, 5 dominadas');
    expect(collectionBarLabel(1, 1, 1)).toBe('1 nueva, 1 en aprendizaje, 1 dominada');
  });
});
