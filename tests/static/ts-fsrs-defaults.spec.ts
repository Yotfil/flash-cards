import { generatorParameters } from 'ts-fsrs';

// La app usa los parámetros por defecto de ts-fsrs (sin configuración propia). Si una
// actualización de la librería los cambia, los intervalos del usuario cambiarían en silencio: esta
// prueba lo detecta antes y obliga a revisar la spec de programación espaciada.
describe('parámetros por defecto de ts-fsrs', () => {
  const parameters = generatorParameters();

  it('retención deseada 0,9 e intervalo máximo de 36 500 días', () => {
    expect(parameters.request_retention).toBe(0.9);
    expect(parameters.maximum_interval).toBe(36_500);
  });

  it('sin aleatorización: la misma entrada da siempre el mismo resultado', () => {
    expect(parameters.enable_fuzz).toBe(false);
  });

  it('pasos cortos activos: aprender en 1 y 10 minutos, reaprender en 10', () => {
    expect(parameters.enable_short_term).toBe(true);
    expect(parameters.learning_steps).toEqual(['1m', '10m']);
    expect(parameters.relearning_steps).toEqual(['10m']);
  });
});
