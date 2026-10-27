import type { SettingsChanges, User } from '../models/user.model';
import type { ReadSource } from './read-source';

// Perfil del usuario en el almacén (`/users/{uid}`).
export abstract class UserRepository {
  /**
   * El perfil validado, o `null` si todavía no existe (con `'device'`, también si el dispositivo no
   * lo tiene guardado). Lanza si el documento no es válido.
   */
  abstract findById(uid: string, source?: ReadSource): Promise<User | null>;
  /** Escribe el perfil completo: solo al crearlo. */
  abstract save(user: User): Promise<void>;
  /**
   * Escribe solo los ajustes indicados (`null` quita la plantilla). El resto del perfil y los
   * ajustes que esta versión no conoce (los que añada una versión posterior) quedan como estaban.
   */
  abstract updateSettings(uid: string, changes: SettingsChanges): Promise<void>;
}
