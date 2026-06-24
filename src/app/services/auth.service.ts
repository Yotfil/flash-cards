// Lógica de sesión: orquesta el puerto de autenticación y el repositorio de usuarios.
// Depende SOLO de puertos del dominio (inyectados); no conoce Firebase. Expone la sesión
// actual como signal para que la UI la consuma.

import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthPort, UserRepository } from '@domain/ports';
import { DEFAULT_NEW_CARDS_PER_DAY } from '@domain/models';
import type { AuthIdentity, User, UserSettings } from '@domain/models';

/** Construye el perfil por defecto de un usuario nuevo a partir de su identidad de auth. */
function buildDefaultUser(identity: AuthIdentity): User {
  const emailLocalPart = identity.email?.split('@')[0];
  const user: User = {
    id: identity.uid,
    displayName: identity.displayName ?? emailLocalPart ?? 'Estudiante',
    email: identity.email ?? '',
    createdAt: new Date(),
    settings: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dayStartHour: 4,
      theme: 'system',
      defaultNewCardsPerDay: DEFAULT_NEW_CARDS_PER_DAY,
    },
    isSearchable: false,
  };
  if (identity.photoURL !== null) {
    user.photoURL = identity.photoURL;
  }
  return user;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authPort = inject(AuthPort);
  private readonly userRepository = inject(UserRepository);

  // undefined = aún resolviendo la sesión inicial; null = sin sesión; User = con sesión.
  private readonly currentUserSignal = signal<User | null | undefined>(undefined);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() != null);

  // Promesa que resuelve cuando se conoce la sesión inicial (para el guard de rutas).
  private resolveInitialized!: () => void;
  private readonly initialized = new Promise<void>((resolve) => {
    this.resolveInitialized = resolve;
  });

  constructor() {
    this.authPort.observeAuthState((identity) => {
      void this.onAuthStateChanged(identity);
    });
  }

  /** Resuelve una vez que la sesión inicial está determinada. */
  whenInitialized(): Promise<void> {
    return this.initialized;
  }

  async registerWithEmail(email: string, password: string, displayName: string): Promise<void> {
    const identity = await this.authPort.registerWithEmail({ email, password, displayName });
    // Escritura autoritativa con el nombre ingresado (gana sobre lo que cree el observer).
    const profile: User = { ...buildDefaultUser(identity), displayName };
    await this.userRepository.save(profile);
    this.currentUserSignal.set(profile);
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    await this.authPort.signInWithEmail({ email, password });
    // El observer carga el perfil y actualiza la sesión.
  }

  async signInWithGoogle(): Promise<void> {
    await this.authPort.signInWithGoogle();
  }

  async signOut(): Promise<void> {
    await this.authPort.signOut();
  }

  /** Actualiza los ajustes del usuario actual (merge parcial), los persiste y refresca la sesión.
   *  Sin sesión es un error explícito (no debería ocurrir tras el guard de rutas). */
  async updateSettings(changes: Partial<UserSettings>): Promise<void> {
    const current = this.currentUserSignal();
    if (!current) {
      throw new Error('No hay una sesión activa para actualizar los ajustes.');
    }
    const updated: User = { ...current, settings: { ...current.settings, ...changes } };
    await this.userRepository.save(updated);
    this.currentUserSignal.set(updated);
  }

  private async onAuthStateChanged(identity: AuthIdentity | null): Promise<void> {
    try {
      this.currentUserSignal.set(identity ? await this.ensureProfile(identity) : null);
    } catch (error) {
      // Error explícito (contrato): no se silencia. Sin perfil, tratamos como sin sesión.
      console.error('No se pudo cargar el perfil del usuario', error);
      this.currentUserSignal.set(null);
    } finally {
      this.resolveInitialized();
    }
  }

  /** Carga el perfil; si todavía no existe (primer acceso), lo crea. Idempotente. */
  private async ensureProfile(identity: AuthIdentity): Promise<User> {
    const existing = await this.userRepository.findById(identity.uid);
    if (existing) {
      return existing;
    }
    const created = buildDefaultUser(identity);
    await this.userRepository.save(created);
    return created;
  }
}
