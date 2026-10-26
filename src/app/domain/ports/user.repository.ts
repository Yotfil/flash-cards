import type { User, UserSettings } from '../models/user.model';

// Perfil del usuario en el almacén (`/users/{uid}`).
export abstract class UserRepository {
  /** El perfil validado, o `null` si todavía no existe. Lanza si el documento no es válido. */
  abstract findById(uid: string): Promise<User | null>;
  /** Escribe el perfil completo: solo al crearlo. */
  abstract save(user: User): Promise<void>;
  /**
   * Escribe solo los ajustes indicados. El resto del perfil y los ajustes que esta versión no
   * conoce (los que añada una versión posterior) quedan como estaban.
   */
  abstract updateSettings(uid: string, changes: Partial<UserSettings>): Promise<void>;
}
