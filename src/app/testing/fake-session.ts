import { computed, signal } from '@angular/core';

import type { SessionState } from '@domain/models/session-state';
import type { User } from '@domain/models/user.model';

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
}
