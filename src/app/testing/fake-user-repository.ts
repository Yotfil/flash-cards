import { applySettingsChanges, type SettingsChanges, type User } from '@domain/models/user.model';
import type { ReadSource } from '@domain/ports/read-source';
import { UserRepository } from '@domain/ports/user.repository';

/** Una escritura parcial de ajustes, tal como la pidió el servicio. */
export interface SettingsUpdate {
  readonly uid: string;
  readonly changes: SettingsChanges;
}

// Fake en memoria del repositorio de perfiles. `failOnFind`, `failOnSave` y `failOnUpdateSettings`
// simulan una lectura o una escritura que falla (sin red, documento inválido); `saved` y
// `settingsUpdates` dejan ver cada escritura. Como el real, `updateSettings` solo toca los ajustes
// indicados del perfil guardado. Lo guardado en el dispositivo va aparte (`seedOnDevice`);
// `holdServerFind` retiene una lectura del servidor ya hecha (devuelve lo que había al pedirla).
// `failOnFindOnDevice` simula un perfil guardado que no se puede leer.
export class FakeUserRepository extends UserRepository {
  readonly saved: User[] = [];
  readonly settingsUpdates: SettingsUpdate[] = [];
  failOnFind: unknown = null;
  failOnFindOnDevice: unknown = null;
  failOnSave: unknown = null;
  failOnUpdateSettings: unknown = null;
  private readonly users = new Map<string, User>();
  private settingsGate: Promise<void> | null = null;
  private findGate: Promise<void> | null = null;
  private readonly onDevice = new Map<string, User>();

  seed(user: User): void {
    this.users.set(user.id, user);
  }

  seedOnDevice(user: User): void {
    this.onDevice.set(user.id, user);
  }

  /** Retiene las lecturas del servidor siguientes (como una red lenta) hasta soltar. */
  holdServerFind(): () => void {
    let release!: () => void;
    this.findGate = new Promise((resolve) => (release = resolve));
    return () => {
      this.findGate = null;
      release();
    };
  }

  async findById(uid: string, source: ReadSource = 'server'): Promise<User | null> {
    if (source === 'device') {
      if (this.failOnFindOnDevice !== null) {
        throw this.failOnFindOnDevice;
      }
      return this.onDevice.get(uid) ?? null;
    }
    if (this.failOnFind !== null) {
      throw this.failOnFind;
    }
    const stored = this.users.get(uid) ?? null;
    await this.findGate;
    return stored;
  }

  async save(user: User): Promise<void> {
    if (this.failOnSave !== null) {
      throw this.failOnSave;
    }
    this.saved.push(user);
    this.users.set(user.id, user);
  }

  /** Deja colgadas las escrituras de ajustes siguientes (como una red lenta) hasta soltar. */
  holdSettingsUpdates(): () => void {
    let release!: () => void;
    this.settingsGate = new Promise((resolve) => (release = resolve));
    return () => {
      this.settingsGate = null;
      release();
    };
  }

  async updateSettings(uid: string, changes: SettingsChanges): Promise<void> {
    await this.settingsGate;
    if (this.failOnUpdateSettings !== null) {
      throw this.failOnUpdateSettings;
    }
    const stored = this.users.get(uid);
    if (!stored) {
      throw new Error(`No existe el perfil ${uid}.`);
    }
    this.settingsUpdates.push({ uid, changes });
    this.users.set(uid, { ...stored, settings: applySettingsChanges(stored.settings, changes) });
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
      practicePackageCapacity: 20,
    },
    ...overrides,
  };
}
