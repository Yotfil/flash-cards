import type { ReadSource } from './read-source';

// Lista de acceso anticipado: un correo entra solo si su entrada existe. La comparación es literal
// (mayúsculas incluidas). Se puede consultar con o sin sesión; nunca se escribe desde la app.
export abstract class AllowlistRepository {
  /** Con `'device'`, `true` solo si el dispositivo guarda la entrada (una lectura anterior). */
  abstract isAllowed(email: string, source?: ReadSource): Promise<boolean>;
}
