// Puerto de conectividad: ¿tiene red el dispositivo ahora mismo? Sin red la app sigue funcionando
// (Firestore encola las escrituras); la UI solo lo muestra como un modo, nunca como un error.
//
// `online` se tipa como función y no como `Signal` porque domain/ no depende de Angular (ADR 0002).
// Las implementaciones devuelven una señal, que cumple este tipo: leerla en una plantilla, un
// `computed` o un `resource` sigue siendo reactivo.
export abstract class ConnectivityPort {
  abstract readonly online: () => boolean;
}
