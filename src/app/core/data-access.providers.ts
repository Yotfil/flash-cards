// Raíz de composición del acceso a datos: enlaza cada PUERTO del dominio con su ADAPTADOR
// concreto de infraestructura. Es el único sitio que conoce ambos a la vez (Ports & Adapters).
// Al cambiar de proveedor, se cambia el adaptador aquí y nada más.

import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { AuthPort, BookRepository, ChapterRepository, UserRepository } from '@domain/ports';
import { FirebaseAuthAdapter } from '@infrastructure/auth';
import {
  FirestoreBookRepository,
  FirestoreChapterRepository,
  FirestoreUserRepository,
} from '@infrastructure/firestore';

export function provideDataAccess(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AuthPort, useClass: FirebaseAuthAdapter },
    { provide: BookRepository, useClass: FirestoreBookRepository },
    { provide: ChapterRepository, useClass: FirestoreChapterRepository },
    { provide: UserRepository, useClass: FirestoreUserRepository },
  ]);
}
