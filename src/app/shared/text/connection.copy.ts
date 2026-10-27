// Sin red, una escritura de Firestore queda pendiente hasta que vuelve la conexión: los controles
// que guardan se deshabilitan y la pantalla lo explica una sola vez con este texto.
export const NEEDS_CONNECTION_MESSAGE = 'Necesitas conexión para guardar cambios.';

// Un guardado que no confirma en unos segundos (wifi sin internet): lo escrito ya está en el
// dispositivo y Firestore lo enviará solo al volver la red, así que el diálogo deja cerrar.
export const SAVED_ON_DEVICE_MESSAGE =
  'Quedó guardado en este dispositivo; se enviará cuando vuelva la red.';

// Importar escribe por lotes y solo el primero queda en el dispositivo: no se promete nada, se
// pide no cerrar la app para que siga al volver la red.
export const IMPORT_WAITS_FOR_CONNECTION_MESSAGE =
  'No hay conexión a internet. La importación seguirá cuando vuelva; no cierres la app.';

// El botón secundario de un diálogo cuyo guardado ya no se puede cancelar.
export const CLOSE_LABEL = 'Cerrar';
