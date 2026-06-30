// Lógica de sesión: orquesta el puerto de autenticación y el repositorio de usuarios.
// Depende SOLO de puertos del dominio (inyectados); no conoce Firebase. Expone la sesión
// actual como signal para que la UI la consuma.

import { Injectable, computed, inject, signal } from '@angular/core';

import { AllowlistRepository, AuthPort, UserRepository } from '@domain/ports';
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
      autoGradeByTime: true,
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
  private readonly allowlistRepository = inject(AllowlistRepository);

  // undefined = aún resolviendo la sesión inicial; null = sin sesión; User = con sesión.
  private readonly currentUserSignal = signal<User | null | undefined>(undefined);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() != null);

  // True cuando hay sesión de Firebase pero el email NO está en la lista de acceso (early
  // access): el usuario quedó autenticado pero sin permiso para usar la app ni tocar la DB.
  private readonly accessDeniedSignal = signal(false);
  readonly accessDenied = this.accessDeniedSignal.asReadonly();

  // Email de la sesión sin acceso, para mostrarlo en la pantalla de "pendiente de acceso".
  private readonly accessDeniedEmailSignal = signal<string | null>(null);
  readonly accessDeniedEmail = this.accessDeniedEmailSignal.asReadonly();

  // True una vez que la sesión inicial quedó determinada (para que las pantallas no naveguen
  // antes de tiempo). Espeja la promesa `initialized` como signal consumible por effects.
  private readonly resolvedSignal = signal(false);
  readonly sessionResolved = this.resolvedSignal.asReadonly();

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
    // Lista de acceso (early access): sin autorización no se crea perfil (las reglas lo
    // rechazarían) y se marca el acceso denegado para mostrar la pantalla correspondiente.
    if (!(await this.isAllowed(identity))) {
      this.denyAccess(identity.email);
      return;
    }
    // Escritura autoritativa con el nombre ingresado (gana sobre lo que cree el observer).
    const profile: User = { ...buildDefaultUser(identity), displayName };
    await this.userRepository.save(profile);
    this.accessDeniedSignal.set(false);
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
      if (!identity) {
        this.accessDeniedSignal.set(false);
        this.accessDeniedEmailSignal.set(null);
        this.currentUserSignal.set(null);
        return;
      }
      // Lista de acceso (early access): si el email no está autorizado, queda con sesión de
      // Firebase pero sin acceso a la app (las reglas le niegan toda lectura/escritura).
      if (!(await this.isAllowed(identity))) {
        this.denyAccess(identity.email);
        return;
      }
      this.accessDeniedSignal.set(false);
      this.currentUserSignal.set(await this.ensureProfile(identity));
    } catch (error) {
      // Error explícito (contrato): no se silencia. Sin perfil, tratamos como sin sesión.
      console.error('No se pudo cargar el perfil del usuario', error);
      this.currentUserSignal.set(null);
    } finally {
      this.resolvedSignal.set(true);
      this.resolveInitialized();
    }
  }

  /** Consulta la lista de acceso. Sin email no hay forma de autorizar (Google siempre lo da). */
  private async isAllowed(identity: AuthIdentity): Promise<boolean> {
    if (!identity.email) {
      return false;
    }
    return this.allowlistRepository.isAllowed(identity.email);
  }

  /** Deja al usuario autenticado pero sin acceso a la app (no está en la lista). */
  private denyAccess(email: string | null): void {
    this.accessDeniedEmailSignal.set(email);
    this.accessDeniedSignal.set(true);
    this.currentUserSignal.set(null);
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
