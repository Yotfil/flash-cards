/**
 * De dónde leer una lista. `'device'`: solo lo que el dispositivo ya tiene guardado, sin tocar la
 * red (al instante; vacío si nunca se leyó). `'server'`: el servidor (sin red, lo guardado, como
 * siempre). Las pantallas pintan primero lo del dispositivo y luego lo del servidor.
 */
export type ReadSource = 'device' | 'server';
