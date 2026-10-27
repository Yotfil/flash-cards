import {
  CLOSE_LABEL,
  IMPORT_WAITS_FOR_CONNECTION_MESSAGE,
  NEEDS_CONNECTION_MESSAGE,
  SAVED_ON_DEVICE_MESSAGE,
} from './connection.copy';

describe('textos de conexión', () => {
  it('son los de la spec', () => {
    expect(NEEDS_CONNECTION_MESSAGE).toBe('Necesitas conexión para guardar cambios.');
    expect(SAVED_ON_DEVICE_MESSAGE).toBe(
      'Quedó guardado en este dispositivo; se enviará cuando vuelva la red.',
    );
    expect(IMPORT_WAITS_FOR_CONNECTION_MESSAGE).toBe(
      'No hay conexión a internet. La importación seguirá cuando vuelva; no cierres la app.',
    );
    expect(CLOSE_LABEL).toBe('Cerrar');
  });
});
