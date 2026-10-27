// Puerto de versión nueva: ¿hay una versión de la app descargada y lista para usarse? La app
// avisa sin obligar y, si el usuario quiere, recarga para estrenarla.
//
// `updateReady` se tipa como función y no como `Signal` porque domain/ no depende de Angular
// (ADR 0002); las implementaciones devuelven una señal, que cumple este tipo.
export abstract class AppUpdatePort {
  abstract readonly updateReady: () => boolean;
  abstract reload(): void;
}
