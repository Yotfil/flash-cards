// Raíz de composición del acceso a datos: enlaza cada PUERTO del dominio con su ADAPTADOR
// concreto de infraestructura. Es el único sitio que conoce ambos a la vez (Ports & Adapters).
// Al cambiar de proveedor, se cambia el adaptador aquí y nada más.

import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import {
  AllowlistRepository,
  AuthPort,
  BookRepository,
  CardRepository,
  ChapterRepository,
  DailyStatsRepository,
  GradePersistencePort,
  ImportRepository,
  ReviewLogRepository,
  SchedulingPort,
  UserRepository,
} from '@domain/ports';
import { FirebaseAuthAdapter } from '@infrastructure/auth';
import {
  FirestoreAllowlistRepository,
  FirestoreBookRepository,
  FirestoreCardRepository,
  FirestoreChapterRepository,
  FirestoreDailyStatsRepository,
  FirestoreGradePersistence,
  FirestoreImportRepository,
  FirestoreReviewLogRepository,
  FirestoreUserRepository,
} from '@infrastructure/firestore';
import { TsFsrsSchedulingAdapter } from '@infrastructure/scheduling';

export function provideDataAccess(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: AllowlistRepository, useClass: FirestoreAllowlistRepository },
    { provide: AuthPort, useClass: FirebaseAuthAdapter },
    { provide: BookRepository, useClass: FirestoreBookRepository },
    { provide: CardRepository, useClass: FirestoreCardRepository },
    { provide: ChapterRepository, useClass: FirestoreChapterRepository },
    { provide: DailyStatsRepository, useClass: FirestoreDailyStatsRepository },
    { provide: GradePersistencePort, useClass: FirestoreGradePersistence },
    { provide: ImportRepository, useClass: FirestoreImportRepository },
    { provide: ReviewLogRepository, useClass: FirestoreReviewLogRepository },
    { provide: SchedulingPort, useClass: TsFsrsSchedulingAdapter },
    { provide: UserRepository, useClass: FirestoreUserRepository },
  ]);
}
