import type { User } from '../models/user.model';

// Perfil del usuario en el almacén (`/users/{uid}`).
export abstract class UserRepository {
  /** El perfil validado, o `null` si todavía no existe. Lanza si el documento no es válido. */
  abstract findById(uid: string): Promise<User | null>;
  /** Escribe el perfil completo. */
  abstract save(user: User): Promise<void>;
}
