// Puerto del repositorio de usuarios: acceso al documento de perfil (`/users/{uid}`) sin
// saber que detrás está Firestore. La implementación vive en `infrastructure/firestore`.

import type { User } from '../models';

export abstract class UserRepository {
  /** Devuelve el perfil del usuario, o null si todavía no existe. */
  abstract findById(uid: string): Promise<User | null>;

  /** Crea o reemplaza el documento de perfil. */
  abstract save(user: User): Promise<void>;
}
