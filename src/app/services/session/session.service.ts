import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { AuthError } from '@domain/models/auth-error';
import type { AuthIdentity } from '@domain/models/auth-identity.model';
import type { SessionState } from '@domain/models/session-state';
import {
  DEFAULT_AUTO_GRADE_BY_TIME,
  DEFAULT_NEW_CARDS_PER_DAY,
} from '@domain/models/study-defaults';
import type { User, UserSettings } from '@domain/models/user.model';
import { AllowlistRepository } from '@domain/ports/allowlist.repository';
import { AuthPort, type EmailCredentials, type Registration } from '@domain/ports/auth.port';
import { Logger } from '@domain/ports/logger.port';
import { UserRepository } from '@domain/ports/user.repository';

import { requireSessionUser } from './require-session';

// Máquina de estados de la sesión. Todo nace del observador del proveedor: cada identidad que
// avisa se comprueba contra la lista de acceso y, si entra, se carga (o crea) su perfil. Los
// métodos de inicio de sesión no activan nada por sí mismos; solo piden al proveedor.
//
//   resolviendo ──null──▶ sin sesión
//        │ identidad
//        ▼
//   ¿en la lista? ──no──▶ sin acceso (correo)
//        │ sí
//        ▼
//   cargar o crear perfil ──falla──▶ error de perfil ──retryProfile()──▶ (vuelve a cargar)
//        │ ok
//        ▼
//   con sesión (perfil)
/** El día de estudio empieza a las 4: un repaso de madrugada cuenta para el día anterior. */
const DEFAULT_DAY_START_HOUR = 4;
const FALLBACK_DISPLAY_NAME = 'Estudiante';

/** La parte del correo antes de la arroba, o "Estudiante" si no hay. */
function displayNameFromEmail(email: string | null): string {
  return email?.split('@')[0] || FALLBACK_DISPLAY_NAME;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly authPort = inject(AuthPort);
  private readonly users = inject(UserRepository);
  private readonly allowlist = inject(AllowlistRepository);
  private readonly logger = inject(Logger);

  private readonly stateSignal = signal<SessionState>({ kind: 'resolving' });
  private readonly resolvedSignal = signal(false);

  readonly state = this.stateSignal.asReadonly();
  /** Cierto desde que la sesión inicial dejó de estar "resolviendo"; no vuelve a falso. */
  readonly resolved = this.resolvedSignal.asReadonly();
  readonly user = computed<User | null>(() => {
    const state = this.state();
    return state.kind === 'active' ? state.user : null;
  });
  readonly isActive = computed(() => this.state().kind === 'active');

  private markInitialResolution!: () => void;
  private readonly initialResolution = new Promise<void>((resolve) => {
    this.markInitialResolution = resolve;
  });

  /** La identidad que avisó el proveedor por última vez (la que `retryProfile` vuelve a cargar). */
  private currentIdentity: AuthIdentity | null = null;
  /** Cada aviso invalida el trabajo asíncrono de los anteriores (resultados viejos se descartan). */
  private generation = 0;
  /**
   * Nombre elegido al registrarse. El observador puede ver la identidad antes de que el proveedor
   * fije su nombre, así que el perfil lo toma de aquí.
   */
  private pendingDisplayName: string | null = null;
  /** Hay una ventana de Google abierta: si su identidad no está en la lista, se borra. */
  private googleSignInInFlight = false;
  /**
   * Se acaba de borrar una identidad no autorizada: el proveedor avisará "sin sesión", pero la
   * sesión debe seguir en "sin acceso" con su correo.
   */
  private keepNoAccessOnNextSignOut = false;

  constructor() {
    const stopObserving = this.authPort.observeAuthState((identity) => {
      void this.handleIdentity(identity);
    });
    inject(DestroyRef).onDestroy(stopObserving);
  }

  /** Se cumple cuando la sesión inicial quedó resuelta: los guards esperan a esto. */
  whenResolved(): Promise<void> {
    return this.initialResolution;
  }

  /**
   * Crea una cuenta con correo y contraseña, solo si el correo está en la lista: fuera de ella no se
   * crea ninguna identidad. La sesión llega después por el observador.
   */
  async register(registration: Registration): Promise<'registered' | 'notAllowlisted'> {
    if (!(await this.isAllowedForRegistration(registration.email))) {
      return 'notAllowlisted';
    }
    const displayName = registration.displayName.trim() || displayNameFromEmail(registration.email);
    this.pendingDisplayName = displayName;
    try {
      await this.authPort.registerWithEmail({ ...registration, displayName });
    } catch (error) {
      this.pendingDisplayName = null;
      throw error;
    }
    return 'registered';
  }

  /** Inicia sesión en el proveedor; la sesión de la app llega por el observador. */
  async signInWithEmail(credentials: EmailCredentials): Promise<void> {
    await this.authPort.signInWithEmail(credentials);
  }

  /** Abre la ventana de Google; la identidad llega por el observador (aunque la ventana calle). */
  async signInWithGoogle(): Promise<void> {
    this.googleSignInInFlight = true;
    try {
      await this.authPort.signInWithGoogle();
    } catch (error) {
      this.googleSignInInFlight = false;
      throw error;
    }
  }

  /** Repite la carga del perfil de la identidad actual tras un error de perfil. */
  async retryProfile(): Promise<void> {
    await this.handleIdentity(this.currentIdentity);
  }

  /**
   * Cierra la sesión del proveedor y deja la app sin sesión, limpiando el correo sin acceso y
   * cualquier error de perfil. Tras borrar una identidad de Google, el proveedor ya no tiene sesión
   * y su cierre es inocuo: el estado pasa igualmente a "sin sesión".
   */
  async signOut(): Promise<void> {
    await this.authPort.signOut();
    this.generation++;
    this.currentIdentity = null;
    this.pendingDisplayName = null;
    this.googleSignInInFlight = false;
    this.keepNoAccessOnNextSignOut = false;
    this.setState({ kind: 'signedOut' });
  }

  /**
   * Guarda ajustes del perfil: escribe el perfil completo con los cambios y, solo si el guardado
   * termina bien, la sesión pasa a reflejarlos. Si falla, el error sube y la sesión no cambia.
   */
  async updateSettings(changes: Partial<UserSettings>): Promise<void> {
    const user = requireSessionUser(this.user());
    const updated: User = { ...user, settings: { ...user.settings, ...changes } };
    await this.users.save(updated);
    this.setState({ kind: 'active', user: updated });
  }

  /** La consulta de la lista sin red se explica como "sin conexión". */
  private async isAllowedForRegistration(email: string): Promise<boolean> {
    try {
      return await this.allowlist.isAllowed(email);
    } catch (error) {
      throw new AuthError('offline', error);
    }
  }

  private async handleIdentity(identity: AuthIdentity | null): Promise<void> {
    const generation = ++this.generation;
    this.currentIdentity = identity;
    if (identity === null) {
      if (this.keepNoAccessOnNextSignOut) {
        this.keepNoAccessOnNextSignOut = false;
        return;
      }
      this.setState({ kind: 'signedOut' });
      return;
    }
    const cameFromGoogle = this.googleSignInInFlight;
    this.googleSignInInFlight = false;

    try {
      const allowed = identity.email !== null && (await this.allowlist.isAllowed(identity.email));
      if (generation !== this.generation) {
        return;
      }
      if (!allowed) {
        this.setState({ kind: 'noAccess', email: identity.email });
        if (cameFromGoogle) {
          await this.discardUnauthorizedIdentity();
        }
        return;
      }

      const profile =
        (await this.users.findById(identity.uid)) ?? (await this.createProfile(identity));
      if (generation === this.generation) {
        this.setState({ kind: 'active', user: profile });
      }
    } catch (error) {
      // Sin red y sin caché, o un perfil que no cumple su forma: la identidad se conserva y la
      // pantalla de acceso ofrece Reintentar o Cerrar sesión.
      if (generation === this.generation) {
        this.logger.error('No se pudo cargar el perfil del usuario', error);
        this.setState({ kind: 'profileError', cause: error });
      }
    }
  }

  /**
   * Una identidad de Google recién creada y fuera de la lista no debe quedar en el proveedor. El
   * borrado es posible porque el inicio de sesión es reciente; si aun así falla, solo se registra.
   */
  private async discardUnauthorizedIdentity(): Promise<void> {
    this.keepNoAccessOnNextSignOut = true;
    try {
      await this.authPort.deleteCurrentIdentity();
    } catch (error) {
      this.keepNoAccessOnNextSignOut = false;
      this.logger.error('No se pudo borrar la identidad de Google no autorizada', error);
    }
  }

  /** Único camino de creación del perfil: el primer acceso de una identidad autorizada. */
  private async createProfile(identity: AuthIdentity): Promise<User> {
    const profile: User = {
      id: identity.uid,
      displayName:
        this.pendingDisplayName ?? identity.displayName ?? displayNameFromEmail(identity.email),
      email: identity.email ?? '',
      createdAt: new Date(),
      ...(identity.photoURL ? { photoURL: identity.photoURL } : {}),
      isSearchable: false,
      settings: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dayStartHour: DEFAULT_DAY_START_HOUR,
        theme: 'system',
        defaultNewCardsPerDay: DEFAULT_NEW_CARDS_PER_DAY,
        autoGradeByTime: DEFAULT_AUTO_GRADE_BY_TIME,
      },
    };
    await this.users.save(profile);
    this.pendingDisplayName = null;
    return profile;
  }

  private setState(state: SessionState): void {
    this.stateSignal.set(state);
    if (state.kind !== 'resolving' && !this.resolvedSignal()) {
      this.resolvedSignal.set(true);
      this.markInitialResolution();
    }
  }
}
