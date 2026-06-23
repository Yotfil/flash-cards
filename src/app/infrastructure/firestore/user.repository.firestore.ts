// Adaptador Firestore del puerto UserRepository. ÚNICA pieza (junto a otros repos) que habla
// con Firestore para los usuarios. Valida con Zod al leer (frontera) y traduce documento ↔
// modelo del dominio. El `id` del modelo es la clave del documento (`users/{uid}`).

import { Injectable, inject } from '@angular/core';
import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';

import { UserRepository } from '@domain/ports';
import type { User } from '@domain/models';
import { FIRESTORE } from '@infrastructure/firebase';
import { userDocumentSchema } from './schemas/user.schema';

const USERS_COLLECTION = 'users';

@Injectable()
export class FirestoreUserRepository extends UserRepository {
  private readonly firestore = inject(FIRESTORE);

  override async findById(uid: string): Promise<User | null> {
    const snapshot = await getDoc(doc(this.firestore, USERS_COLLECTION, uid));
    if (!snapshot.exists()) {
      return null;
    }

    // Frontera: el dato es externo, se valida antes de tocarlo. `parse` lanza si no cumple.
    const data = userDocumentSchema.parse(snapshot.data());

    // Se construye explícitamente: con exactOptionalPropertyTypes los opcionales solo se
    // asignan cuando están presentes (no como `undefined`).
    const user: User = {
      id: uid,
      displayName: data.displayName,
      email: data.email,
      createdAt: data.createdAt,
      settings: data.settings,
      isSearchable: data.isSearchable,
    };
    if (data.handle !== undefined) {
      user.handle = data.handle;
    }
    if (data.photoURL !== undefined) {
      user.photoURL = data.photoURL;
    }
    return user;
  }

  override async save(user: User): Promise<void> {
    const data: Record<string, unknown> = {
      displayName: user.displayName,
      email: user.email,
      createdAt: Timestamp.fromDate(user.createdAt),
      settings: user.settings,
      isSearchable: user.isSearchable,
    };
    // Firestore rechaza `undefined`: solo se incluyen los opcionales presentes.
    if (user.handle !== undefined) {
      data['handle'] = user.handle;
    }
    if (user.photoURL !== undefined) {
      data['photoURL'] = user.photoURL;
    }

    await setDoc(doc(this.firestore, USERS_COLLECTION, user.id), data);
  }
}
