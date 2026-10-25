import type { User } from '@domain/models/user.model';
import { UserRepository } from '@domain/ports/user.repository';

// Fake en memoria del repositorio de perfiles. `failOnFind` simula una lectura que falla (sin red,
// documento inválido); `saved` deja ver cada escritura.
export class FakeUserRepository extends UserRepository {
  readonly saved: User[] = [];
  failOnFind: unknown = null;
  private readonly users = new Map<string, User>();

  seed(user: User): void {
    this.users.set(user.id, user);
  }

  async findById(uid: string): Promise<User | null> {
    if (this.failOnFind !== null) {
      throw this.failOnFind;
    }
    return this.users.get(uid) ?? null;
  }

  async save(user: User): Promise<void> {
    this.saved.push(user);
    this.users.set(user.id, user);
  }
}

/** Perfil de prueba con valores razonables; se sobrescribe lo que haga falta. */
export function aUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    displayName: 'Ada',
    email: 'ada@ejemplo.com',
    createdAt: new Date('2026-06-15T10:00:00.000Z'),
    isSearchable: false,
    settings: {
      timezone: 'America/Bogota',
      dayStartHour: 4,
      theme: 'system',
      defaultNewCardsPerDay: 20,
      autoGradeByTime: true,
    },
    ...overrides,
  };
}
