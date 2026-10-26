import { computed, signal } from '@angular/core';

import type { SessionState } from '@domain/models/session-state';
import { applySettingsChanges, type SettingsChanges, type User } from '@domain/models/user.model';

// Fake del servicio de sesión para guards, rutas y pantallas que solo leen el estado: la prueba
// fija el estado con `setState`. `whenResolved` se cumple al primer estado distinto de
// "resolviendo", como el real. Se provee con `{ provide: SessionService, useValue: fake }`.
export class FakeSessionService {
  private readonly stateSignal = signal<SessionState>({ kind: 'resolving' });
  readonly state = this.stateSignal.asReadonly();
  readonly resolved = computed(() => this.state().kind !== 'resolving');
  readonly user = computed<User | null>(() => {
    const state = this.state();
    return state.kind === 'active' ? state.user : null;
  });
  readonly isActive = computed(() => this.state().kind === 'active');

  signOuts = 0;
  profileRetries = 0;
  readonly settingsUpdates: SettingsChanges[] = [];
  /** Si no es `null`, `updateSettings` falla con esto y el perfil no cambia. */
  failOnUpdate: unknown = null;
  private updateGate: Promise<void> | null = null;

  private signOutGate: Promise<void> | null = null;
  private markResolved!: () => void;
  private readonly resolution = new Promise<void>((resolve) => {
    this.markResolved = resolve;
  });

  constructor(initialState?: SessionState) {
    if (initialState) {
      this.setState(initialState);
    }
  }

  setState(state: SessionState): void {
    this.stateSignal.set(state);
    if (state.kind !== 'resolving') {
      this.markResolved();
    }
  }

  whenResolved(): Promise<void> {
    return this.resolution;
  }

  /** Deja colgado el próximo cierre de sesión (como un proveedor lento) hasta soltar. */
  holdSignOut(): () => void {
    let release!: () => void;
    this.signOutGate = new Promise((resolve) => (release = resolve));
    return () => {
      this.signOutGate = null;
      release();
    };
  }

  async signOut(): Promise<void> {
    this.signOuts++;
    await this.signOutGate;
    this.setState({ kind: 'signedOut' });
  }

  async retryProfile(): Promise<void> {
    this.profileRetries++;
  }

  /** Deja colgados los guardados de ajustes siguientes hasta soltar. */
  holdUpdates(): () => void {
    let release!: () => void;
    this.updateGate = new Promise((resolve) => (release = resolve));
    return () => {
      this.updateGate = null;
      release();
    };
  }

  /** Como el real: solo si el guardado sale bien, el perfil en sesión refleja el cambio. */
  async updateSettings(changes: SettingsChanges): Promise<void> {
    this.settingsUpdates.push(changes);
    await this.updateGate;
    if (this.failOnUpdate !== null) {
      throw this.failOnUpdate;
    }
    const state = this.state();
    if (state.kind !== 'active') {
      throw new Error('No hay una sesión activa.');
    }
    this.setState({
      kind: 'active',
      user: { ...state.user, settings: applySettingsChanges(state.user.settings, changes) },
    });
  }
}
