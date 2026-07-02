import { TestBed } from '@angular/core/testing';

import { AllowlistRepository, AuthPort, UserRepository } from '@domain/ports';
import type { AuthIdentity, User } from '@domain/models';
import { AuthService } from './auth.service';

/** AuthPort de prueba: no observa nada (la sesión inicial se deja sin resolver) y registra con
 *  una identidad fija, para ejercitar el gateo por lista de acceso sin tocar Firebase. */
class FakeAuthPort extends AuthPort {
  override observeAuthState(): () => void {
    return () => undefined;
  }
  override async registerWithEmail(): Promise<AuthIdentity> {
    return { uid: 'uid-1', email: 'nuevo@ejemplo.com', displayName: null, photoURL: null };
  }
  override async signInWithEmail(): Promise<AuthIdentity> {
    return { uid: 'uid-1', email: 'nuevo@ejemplo.com', displayName: null, photoURL: null };
  }
  override signInWithGoogle(): Promise<void> {
    return Promise.resolve();
  }
  override signOut(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeUserRepository extends UserRepository {
  saved: User[] = [];
  override async findById(): Promise<User | null> {
    return null;
  }
  override async save(user: User): Promise<void> {
    this.saved.push(user);
  }
}

class FakeAllowlistRepository extends AllowlistRepository {
  constructor(private readonly allowed: boolean) {
    super();
  }
  override async isAllowed(): Promise<boolean> {
    return this.allowed;
  }
}

function configure(allowed: boolean): { service: AuthService; users: FakeUserRepository } {
  const users = new FakeUserRepository();
  TestBed.configureTestingModule({
    providers: [
      AuthService,
      { provide: AuthPort, useClass: FakeAuthPort },
      { provide: UserRepository, useValue: users },
      { provide: AllowlistRepository, useValue: new FakeAllowlistRepository(allowed) },
    ],
  });
  return { service: TestBed.inject(AuthService), users };
}

describe('AuthService · lista de acceso (early access)', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('si el email NO está en la lista: niega acceso y no crea perfil', async () => {
    const { service, users } = configure(false);

    await service.registerWithEmail('nuevo@ejemplo.com', 'secreto', 'Nuevo');

    expect(service.accessDenied()).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.accessDeniedEmail()).toBe('nuevo@ejemplo.com');
    expect(users.saved).toHaveLength(0);
  });

  it('si el email está en la lista: crea el perfil y da acceso', async () => {
    const { service, users } = configure(true);

    await service.registerWithEmail('nuevo@ejemplo.com', 'secreto', 'Nuevo');

    expect(service.accessDenied()).toBe(false);
    expect(service.isAuthenticated()).toBe(true);
    expect(users.saved).toHaveLength(1);
    expect(users.saved[0]?.displayName).toBe('Nuevo');
  });
});
