import { TestBed } from '@angular/core/testing';

import { AuthError } from '@domain/models/auth-error';

import { AllowlistRepository } from '@domain/ports/allowlist.repository';
import { AuthPort } from '@domain/ports/auth.port';
import { Logger } from '@domain/ports/logger.port';
import { UserRepository } from '@domain/ports/user.repository';
import { FakeAllowlistRepository } from '@testing/fake-allowlist-repository';
import { FakeAuthPort, anIdentity } from '@testing/fake-auth-port';
import { FakeLogger } from '@testing/fake-logger';
import { FakeUserRepository, aUser } from '@testing/fake-user-repository';

import { SessionService } from './session.service';

/** Deja correr las promesas pendientes (las de los fakes se resuelven de inmediato). */
const settle = () => new Promise((resolve) => setTimeout(resolve));

function setup(allowedEmails: readonly string[] = ['ada@ejemplo.com']) {
  const authPort = new FakeAuthPort();
  const users = new FakeUserRepository();
  const allowlist = new FakeAllowlistRepository(allowedEmails);
  const logger = new FakeLogger();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthPort, useValue: authPort },
      { provide: UserRepository, useValue: users },
      { provide: AllowlistRepository, useValue: allowlist },
      { provide: Logger, useValue: logger },
    ],
  });
  const session = TestBed.inject(SessionService);
  return { session, authPort, users, allowlist, logger };
}

describe('SessionService · resolución y estados', () => {
  it('no está resuelta hasta el primer aviso del proveedor', async () => {
    const { session, authPort } = setup();
    let resolvedByPromise = false;
    void session.whenResolved().then(() => (resolvedByPromise = true));

    await settle();
    expect(session.resolved()).toBe(false);
    expect(session.state().kind).toBe('resolving');
    expect(resolvedByPromise).toBe(false);

    authPort.emit(null);
    await settle();

    expect(session.resolved()).toBe(true);
    expect(resolvedByPromise).toBe(true);
  });

  it('sin identidad queda sin sesión', async () => {
    const { session, authPort } = setup();

    authPort.emit(null);
    await settle();

    expect(session.state()).toEqual({ kind: 'signedOut' });
    expect(session.user()).toBeNull();
    expect(session.isActive()).toBe(false);
  });

  it('una identidad autorizada con perfil existente queda activa sin reescribir el perfil', async () => {
    const { session, authPort, users } = setup();
    const profile = aUser({ id: 'u1', displayName: 'Ada Lovelace' });
    users.seed(profile);

    authPort.emit(anIdentity({ uid: 'u1', email: 'ada@ejemplo.com' }));
    await settle();

    expect(session.state()).toEqual({ kind: 'active', user: profile });
    expect(session.user()).toBe(profile);
    expect(session.isActive()).toBe(true);
    expect(users.saved).toEqual([]);
  });

  it('una identidad sin correo queda sin acceso', async () => {
    const { session, authPort } = setup();

    authPort.emit(anIdentity({ email: null }));
    await settle();

    expect(session.state()).toEqual({ kind: 'noAccess', email: null });
  });

  it('una identidad fuera de la lista queda sin acceso con su correo (comparación literal)', async () => {
    const { session, authPort } = setup(['Ada@Ejemplo.com']);

    authPort.emit(anIdentity({ email: 'ada@ejemplo.com' }));
    await settle();

    expect(session.state()).toEqual({ kind: 'noAccess', email: 'ada@ejemplo.com' });
  });
});

describe('SessionService · perfil del primer acceso', () => {
  const NOW = new Date('2026-06-15T10:30:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('crea el perfil con los valores por defecto de la spec, una sola vez', async () => {
    const { session, authPort, users } = setup();

    authPort.emit(
      anIdentity({
        uid: 'u9',
        email: 'ada@ejemplo.com',
        displayName: 'Ada Lovelace',
        photoURL: 'https://foto.example/ada.png',
      }),
    );
    await settle();

    const expected = {
      id: 'u9',
      displayName: 'Ada Lovelace',
      email: 'ada@ejemplo.com',
      createdAt: NOW,
      photoURL: 'https://foto.example/ada.png',
      isSearchable: false,
      settings: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dayStartHour: 4,
        theme: 'system',
        defaultNewCardsPerDay: 20,
        autoGradeByTime: true,
        practicePackageCapacity: 20,
      },
    };
    expect(users.saved).toEqual([expected]);
    expect(session.state()).toEqual({ kind: 'active', user: expected });
  });

  it('sin foto en la identidad, el perfil no lleva foto', async () => {
    const { authPort, users } = setup();

    authPort.emit(anIdentity({ photoURL: null }));
    await settle();

    expect(users.saved[0]).not.toHaveProperty('photoURL');
  });

  it('sin nombre en la identidad usa la parte local del correo', async () => {
    const { authPort, users } = setup();

    authPort.emit(anIdentity({ email: 'ada@ejemplo.com', displayName: null }));
    await settle();

    expect(users.saved[0]?.displayName).toBe('ada');
  });

  it('sin nombre ni parte local usa "Estudiante"', async () => {
    const { authPort, users } = setup(['@ejemplo.com']);

    authPort.emit(anIdentity({ email: '@ejemplo.com', displayName: null }));
    await settle();

    expect(users.saved[0]?.displayName).toBe('Estudiante');
  });
});

describe('SessionService · registro', () => {
  it('con un correo fuera de la lista no crea ninguna identidad', async () => {
    const { session, authPort } = setup(['ada@ejemplo.com']);
    authPort.emit(null);
    await settle();

    const result = await session.register({
      email: 'nuevo@ejemplo.com',
      password: 'secreta',
      displayName: 'Nuevo',
    });

    expect(result).toBe('notAllowlisted');
    expect(authPort.registrations).toEqual([]);
  });

  it('el correo tecleado con mayúsculas o espacios se compara como lo guarda el proveedor (en minúsculas)', async () => {
    const { session, authPort } = setup(['ana.perez@example.com']);
    authPort.emit(null);
    await settle();

    const result = await session.register({
      email: '  Ana.Perez@Example.COM ',
      password: 'secreta',
      displayName: 'Ana',
    });

    expect(result).toBe('registered');
    expect(authPort.registrations.map((registration) => registration.email)).toEqual([
      'ana.perez@example.com',
    ]);
  });

  it('con un correo autorizado crea la identidad y el perfil toma el nombre elegido', async () => {
    const { session, authPort, users } = setup(['ada@ejemplo.com']);
    authPort.emit(null);
    await settle();

    const result = await session.register({
      email: 'ada@ejemplo.com',
      password: 'secreta',
      displayName: 'Ada',
    });
    // El observador ve la identidad antes de que el proveedor fije el nombre.
    authPort.emit(anIdentity({ email: 'ada@ejemplo.com', displayName: null }));
    await settle();

    expect(result).toBe('registered');
    expect(authPort.registrations).toEqual([
      { email: 'ada@ejemplo.com', password: 'secreta', displayName: 'Ada' },
    ]);
    expect(users.saved.map((user) => user.displayName)).toEqual(['Ada']);
    expect(session.user()?.displayName).toBe('Ada');
  });

  it('con el nombre vacío usa la parte local del correo', async () => {
    const { session, authPort, users } = setup(['ada@ejemplo.com']);
    authPort.emit(null);
    await settle();

    await session.register({ email: 'ada@ejemplo.com', password: 'secreta', displayName: '  ' });
    authPort.emit(anIdentity({ email: 'ada@ejemplo.com', displayName: null }));
    await settle();

    expect(authPort.registrations[0]?.displayName).toBe('ada');
    expect(users.saved[0]?.displayName).toBe('ada');
  });

  it('si la lista no responde por falta de red, falla como "sin conexión"', async () => {
    const { session, authPort, allowlist } = setup();
    allowlist.failWith = new Error('Failed to get document because the client is offline.');

    const failure = await session
      .register({ email: 'ada@ejemplo.com', password: 'secreta', displayName: '' })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AuthError);
    expect((failure as AuthError).kind).toBe('offline');
    expect(authPort.registrations).toEqual([]);
  });
});

describe('SessionService · inicio de sesión, Google y acceso retirado', () => {
  it('con credenciales correctas pide al proveedor y la sesión llega por el observador', async () => {
    const { session, authPort, users } = setup();
    users.seed(aUser({ id: 'u1' }));
    authPort.emit(null);
    await settle();

    await session.signInWithEmail({ email: 'ada@ejemplo.com', password: 'secreta' });
    expect(session.state().kind).toBe('signedOut');
    authPort.emit(anIdentity({ uid: 'u1' }));
    await settle();

    expect(authPort.emailSignIns).toEqual([{ email: 'ada@ejemplo.com', password: 'secreta' }]);
    expect(session.state().kind).toBe('active');
  });

  it('Google autorizado activa la sesión aunque la ventana no informe nada', async () => {
    const { session, authPort } = setup();
    authPort.emit(null);
    await settle();

    await session.signInWithGoogle();
    authPort.emit(anIdentity({ email: 'ada@ejemplo.com' }));
    await settle();

    expect(authPort.googleSignIns).toBe(1);
    expect(authPort.deletions).toBe(0);
    expect(session.state().kind).toBe('active');
  });

  it('Google no autorizado borra la identidad y queda sin acceso con su correo', async () => {
    const { session, authPort, users } = setup(['ada@ejemplo.com']);
    authPort.emit(null);
    await settle();

    await session.signInWithGoogle();
    authPort.emit(anIdentity({ email: 'nuevo@ejemplo.com' }));
    await settle();

    expect(authPort.deletions).toBe(1);
    // Borrar la identidad hace que el proveedor avise "sin sesión"; el estado no cambia por eso.
    expect(session.state()).toEqual({ kind: 'noAccess', email: 'nuevo@ejemplo.com' });
    expect(users.saved).toEqual([]);
  });

  it('una cuenta de Google que ya existía y salió de la lista queda sin acceso sin borrarse', async () => {
    // Ana usa Cadence con Google desde hace meses. Sale de la lista, cierra sesión y vuelve a
    // "Continuar con Google": la ventana devuelve su misma cuenta, no una recién creada.
    const { session, authPort, users, allowlist } = setup(['ana@ejemplo.com']);
    const ana = anIdentity({ uid: 'ana-uid', email: 'ana@ejemplo.com' });
    users.seed(aUser({ id: 'ana-uid', email: 'ana@ejemplo.com' }));
    authPort.emit(ana);
    await settle();
    await session.signOut();
    allowlist.revoke('ana@ejemplo.com');
    authPort.googleIdentityIsNew = false;

    await session.signInWithGoogle();
    authPort.emit(ana);
    await settle();

    expect(authPort.deletions).toBe(0);
    expect(session.state()).toEqual({ kind: 'noAccess', email: 'ana@ejemplo.com' });
  });

  it('si otra identidad avisa mientras se espera la ventana de Google, no se borra ninguna', async () => {
    const { session, authPort } = setup(['ada@ejemplo.com']);
    authPort.emit(null);
    await settle();
    const release = authPort.hold();

    const signingIn = session.signInWithGoogle();
    authPort.emit(anIdentity({ uid: 'nuevo-uid', email: 'nuevo@ejemplo.com' }));
    await settle();
    authPort.emit(anIdentity({ uid: 'u1', email: 'ada@ejemplo.com' }));
    await settle();
    release();
    await signingIn;
    await settle();

    expect(authPort.deletions).toBe(0);
    expect(session.state().kind).toBe('active');
  });

  it('si la ventana de Google falla después de avisar la identidad, no se borra', async () => {
    const { session, authPort } = setup([]);
    authPort.emit(null);
    await settle();
    const release = authPort.hold();

    const signingIn = session.signInWithGoogle();
    authPort.emit(anIdentity({ email: 'nuevo@ejemplo.com' }));
    await settle();
    authPort.failWith.signInWithGoogle = new Error('auth/internal-error');
    release();
    await expect(signingIn).rejects.toThrow('auth/internal-error');
    await settle();

    expect(authPort.deletions).toBe(0);
    expect(session.state()).toEqual({ kind: 'noAccess', email: 'nuevo@ejemplo.com' });
  });

  it('una sesión guardada cuyo correo salió de la lista queda sin acceso sin borrar nada', async () => {
    const { session, authPort } = setup([]);

    authPort.emit(anIdentity({ email: 'ada@ejemplo.com' }));
    await settle();

    expect(authPort.deletions).toBe(0);
    expect(session.state()).toEqual({ kind: 'noAccess', email: 'ada@ejemplo.com' });
  });

  it('si borrar la identidad falla, se registra y la sesión queda igual sin acceso', async () => {
    const { session, authPort, logger } = setup([]);
    authPort.failWith.deleteCurrentIdentity = new Error('auth/requires-recent-login');
    authPort.emit(null);
    await settle();

    await session.signInWithGoogle();
    authPort.emit(anIdentity({ email: 'nuevo@ejemplo.com' }));
    await settle();

    expect(session.state()).toEqual({ kind: 'noAccess', email: 'nuevo@ejemplo.com' });
    expect(logger.entries.filter((entry) => entry.level === 'error')).toHaveLength(1);
  });
});

describe('SessionService · error de perfil y cierre de sesión', () => {
  it('si el perfil no se puede leer queda en error de perfil y se registra la causa', async () => {
    const { session, authPort, users, logger } = setup();
    const cause = new Error('Failed to get document because the client is offline.');
    users.failOnFind = cause;

    authPort.emit(anIdentity());
    await settle();

    expect(session.state()).toEqual({ kind: 'profileError', cause });
    expect(session.resolved()).toBe(true);
    expect(logger.entries).toContainEqual(expect.objectContaining({ level: 'error', cause }));
  });

  it('si la lista no responde al arrancar, también queda en error de perfil', async () => {
    const { session, authPort, allowlist } = setup();
    allowlist.failWith = new Error('offline');

    authPort.emit(anIdentity());
    await settle();

    expect(session.state().kind).toBe('profileError');
  });

  it('reintentar con el almacén ya sano activa la sesión sin volver a iniciarla', async () => {
    const { session, authPort, users } = setup();
    users.seed(aUser({ id: 'u1' }));
    users.failOnFind = new Error('offline');
    authPort.emit(anIdentity({ uid: 'u1' }));
    await settle();

    users.failOnFind = null;
    await session.retryProfile();

    expect(session.state().kind).toBe('active');
    expect(authPort.emailSignIns).toEqual([]);
  });

  it.each([
    ['con sesión', () => anIdentity(), (users: FakeUserRepository) => users.seed(aUser())],
    ['sin acceso', () => anIdentity({ email: 'nuevo@ejemplo.com' }), () => undefined],
    [
      'con error de perfil',
      () => anIdentity(),
      (users: FakeUserRepository) => (users.failOnFind = new Error('offline')),
    ],
  ])('cerrar sesión %s deja la sesión cerrada', async (_label, identity, prepare) => {
    const { session, authPort, users } = setup();
    prepare(users);
    authPort.emit(identity());
    await settle();

    await session.signOut();
    await settle();

    expect(authPort.signOuts).toBe(1);
    expect(session.state()).toEqual({ kind: 'signedOut' });
  });

  it('cerrar sesión tras borrar una identidad de Google también la deja cerrada', async () => {
    const { session, authPort } = setup([]);
    authPort.emit(null);
    await settle();
    await session.signInWithGoogle();
    authPort.emit(anIdentity({ email: 'nuevo@ejemplo.com' }));
    await settle();

    await session.signOut();
    await settle();

    expect(session.state()).toEqual({ kind: 'signedOut' });
  });
});

describe('SessionService · ajustes', () => {
  async function activeSession() {
    const context = setup();
    context.users.seed(
      aUser({
        id: 'u1',
        settings: {
          timezone: 'America/Bogota',
          dayStartHour: 4,
          theme: 'dark',
          defaultNewCardsPerDay: 15,
          autoGradeByTime: true,
          practicePackageCapacity: 20,
        },
      }),
    );
    context.authPort.emit(anIdentity({ uid: 'u1' }));
    await settle();
    return context;
  }

  it('una plantilla propia se guarda y `null` la quita (vuelve la plantilla por defecto)', async () => {
    const { session, users } = await activeSession();

    await session.updateSettings({ promptTemplate: 'Mi [[REPASADAS]]' });
    expect(session.user()?.settings.promptTemplate).toBe('Mi [[REPASADAS]]');
    expect((await users.findById('u1'))?.settings.promptTemplate).toBe('Mi [[REPASADAS]]');

    await session.updateSettings({ promptTemplate: null });
    expect(session.user()?.settings).not.toHaveProperty('promptTemplate');
    expect(users.settingsUpdates.at(-1)).toEqual({ uid: 'u1', changes: { promptTemplate: null } });
    expect((await users.findById('u1'))?.settings).not.toHaveProperty('promptTemplate');
  });

  it('guarda solo el ajuste cambiado y la sesión lo fusiona con los demás intactos', async () => {
    const { session, users } = await activeSession();

    await session.updateSettings({ defaultNewCardsPerDay: 5 });

    expect(users.settingsUpdates).toEqual([{ uid: 'u1', changes: { defaultNewCardsPerDay: 5 } }]);
    expect(users.saved).toEqual([]);
    expect(session.user()?.settings).toEqual({
      timezone: 'America/Bogota',
      dayStartHour: 4,
      theme: 'dark',
      defaultNewCardsPerDay: 5,
      autoGradeByTime: true,
      practicePackageCapacity: 20,
    });
  });

  it('si el guardado falla el error sube y la sesión conserva el valor anterior', async () => {
    const { session, users } = await activeSession();
    const cause = new Error('offline');
    users.failOnUpdateSettings = cause;

    await expect(session.updateSettings({ defaultNewCardsPerDay: 5 })).rejects.toBe(cause);

    expect(session.user()?.settings.defaultNewCardsPerDay).toBe(15);
  });

  it('sin sesión lanza un error explícito y no escribe nada', async () => {
    const { session, authPort, users } = setup();
    authPort.emit(null);
    await settle();

    await expect(session.updateSettings({ dayStartHour: 2 })).rejects.toThrow(
      'No hay una sesión activa.',
    );
    expect(users.settingsUpdates).toEqual([]);
  });

  it('dos ajustes cambiados seguidos se guardan los dos, en el perfil y en la sesión', async () => {
    const { session, users } = await activeSession();

    // Ada toca "Claro" y, antes de que termine ese guardado, desmarca la sugerencia por tiempo.
    const theme = session.updateSettings({ theme: 'light' });
    const suggestion = session.updateSettings({ autoGradeByTime: false });
    await Promise.all([theme, suggestion]);

    const stored = await users.findById('u1');
    expect(stored?.settings.theme).toBe('light');
    expect(stored?.settings.autoGradeByTime).toBe(false);
    expect(session.user()?.settings.theme).toBe('light');
    expect(session.user()?.settings.autoGradeByTime).toBe(false);
  });

  it('si la sesión se cierra mientras se guarda un ajuste, no vuelve a quedar activa', async () => {
    const { session, users } = await activeSession();
    const release = users.holdSettingsUpdates();

    const saving = session.updateSettings({ theme: 'light' });
    await session.signOut();
    release();
    await saving;

    expect(session.state()).toEqual({ kind: 'signedOut' });
  });
});
