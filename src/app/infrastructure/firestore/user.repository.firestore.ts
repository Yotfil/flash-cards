import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

import type { User } from '@domain/models/user.model';
import { UserRepository } from '@domain/ports/user.repository';

import { parseDocument } from './document-boundary';
import { userDocumentSchema, type UserDocument } from './schemas/user.schema';

// Perfil del usuario en `users/{uid}`. Lee a través de la frontera (Zod + error con ruta) y
// escribe el documento completo.
export class FirestoreUserRepository extends UserRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async findById(uid: string): Promise<User | null> {
    const snapshot = await getDoc(this.profileRef(uid));
    if (!snapshot.exists()) {
      return null;
    }
    return toUser(uid, parseDocument(userDocumentSchema, snapshot.ref.path, snapshot.data()));
  }

  async save(user: User): Promise<void> {
    await setDoc(this.profileRef(user.id), toUserDocument(user));
  }

  private profileRef(uid: string) {
    return doc(this.firestore, 'users', uid);
  }
}

// Los opcionales ausentes no se escriben ni se devuelven como `undefined`.
function toUser(id: string, document: UserDocument): User {
  return {
    id,
    displayName: document.displayName,
    email: document.email,
    createdAt: document.createdAt,
    settings: document.settings,
    isSearchable: document.isSearchable,
    ...(document.handle !== undefined ? { handle: document.handle } : {}),
    ...(document.photoURL !== undefined ? { photoURL: document.photoURL } : {}),
  };
}

function toUserDocument(user: User): Record<string, unknown> {
  return {
    displayName: user.displayName,
    email: user.email,
    createdAt: user.createdAt,
    settings: user.settings,
    isSearchable: user.isSearchable,
    ...(user.handle !== undefined ? { handle: user.handle } : {}),
    ...(user.photoURL !== undefined ? { photoURL: user.photoURL } : {}),
  };
}
