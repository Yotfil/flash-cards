import { deleteField, doc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';

import type { SettingsChanges, User, UserSettings } from '@domain/models/user.model';
import type { ReadSource } from '@domain/ports/read-source';
import { UserRepository } from '@domain/ports/user.repository';

import { parseDocument } from './document-boundary';
import { readDocFrom } from './read-from';
import { userDocumentSchema, type UserDocument } from './schemas/user.schema';

// Perfil del usuario en `users/{uid}`. Lee a través de la frontera (Zod + error con ruta), que
// recorta lo que esta versión no conoce: por eso el documento completo solo se escribe al crearlo,
// y un ajuste se guarda por su ruta (`settings.theme`), sin reescribir lo demás.
export class FirestoreUserRepository extends UserRepository {
  constructor(private readonly firestore: Firestore) {
    super();
  }

  async findById(uid: string, source: ReadSource = 'server'): Promise<User | null> {
    const snapshot = await readDocFrom(this.profileRef(uid), source);
    if (!snapshot?.exists()) {
      return null;
    }
    return toUser(uid, parseDocument(userDocumentSchema, snapshot.ref.path, snapshot.data()));
  }

  async save(user: User): Promise<void> {
    await setDoc(this.profileRef(user.id), toUserDocument(user));
  }

  /** `null` quita el campo (la plantilla vuelve a la de por defecto); `undefined` no se toca. */
  async updateSettings(uid: string, changes: SettingsChanges): Promise<void> {
    const paths = Object.entries(changes)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => [`settings.${name}`, value === null ? deleteField() : value]);
    if (paths.length === 0) {
      return;
    }
    await updateDoc(this.profileRef(uid), Object.fromEntries(paths));
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
    settings: toSettings(document.settings),
    isSearchable: document.isSearchable,
    ...(document.handle !== undefined ? { handle: document.handle } : {}),
    ...(document.photoURL !== undefined ? { photoURL: document.photoURL } : {}),
  };
}

function toSettings(settings: UserDocument['settings']): UserSettings {
  const { promptTemplate, ...rest } = settings;
  return { ...rest, ...(promptTemplate !== undefined ? { promptTemplate } : {}) };
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
