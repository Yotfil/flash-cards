// Puerto de registro de eventos. La app nunca habla con `console` directamente: todo pasa por
// aquí, de modo que cambiar el destino (consola hoy, un servicio externo algún día) sea un
// adaptador nuevo en infrastructure/ y no una cacería de llamadas.
//
// Clase abstracta y no interfaz: así sirve de token de inyección sin un InjectionToken aparte
// (mismo patrón que los demás puertos del proyecto).
export abstract class Logger {
  /** Algo útil para seguir el flujo (inicio de sesión, sincronización). */
  abstract info(message: string): void;
  /** Algo raro que no impide continuar (sin conexión, dato inesperado tolerado). */
  abstract warn(message: string, cause?: unknown): void;
  /** Un fallo real. `cause` es el error original, para no perder su pila. */
  abstract error(message: string, cause?: unknown): void;
}
