import { TestBed } from '@angular/core/testing';
import {
  Router,
  provideRouter,
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';

import type { SessionState } from '@domain/models/session-state';
import { SessionService } from '@services/session/session.service';
import { FakeSessionService } from '@testing/fake-session';
import { aUser } from '@testing/fake-user-repository';

import { guestOnlyGuard, requireSessionGuard } from './session.guards';

function run(guard: CanActivateFn, session: FakeSessionService) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: SessionService, useValue: session }],
  });
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as Promise<boolean | UrlTree>;
}

async function outcome(guard: CanActivateFn, state: SessionState): Promise<string | boolean> {
  const result = await run(guard, new FakeSessionService(state));
  return typeof result === 'boolean' ? result : TestBed.inject(Router).serializeUrl(result);
}

const ACTIVE: SessionState = { kind: 'active', user: aUser() };
const NO_ACCESS: SessionState = { kind: 'noAccess', email: 'nuevo@ejemplo.com' };
const SIGNED_OUT: SessionState = { kind: 'signedOut' };
const PROFILE_ERROR: SessionState = { kind: 'profileError', cause: new Error('offline') };

describe('guards de sesión', () => {
  it.each([requireSessionGuard, guestOnlyGuard])(
    'esperan a que la sesión se resuelva',
    async (guard) => {
      const session = new FakeSessionService();
      let decided = false;
      const decision = run(guard, session).then(() => (decided = true));

      await new Promise((resolve) => setTimeout(resolve));
      expect(decided).toBe(false);

      session.setState(SIGNED_OUT);
      await decision;
      expect(decided).toBe(true);
    },
  );

  it.each([
    ['con sesión', ACTIVE, true],
    ['sin acceso', NO_ACCESS, '/sin-acceso'],
    ['sin sesión', SIGNED_OUT, '/login'],
    ['con error de perfil', PROFILE_ERROR, '/login'],
  ] as const)('ruta protegida %s → %s', async (_label, state, expected) => {
    expect(await outcome(requireSessionGuard, state)).toBe(expected);
  });

  it.each([
    ['con sesión', ACTIVE, '/'],
    ['sin acceso', NO_ACCESS, '/sin-acceso'],
    ['sin sesión', SIGNED_OUT, true],
    ['con error de perfil', PROFILE_ERROR, true],
  ] as const)('acceso de invitado %s → %s', async (_label, state, expected) => {
    expect(await outcome(guestOnlyGuard, state)).toBe(expected);
  });
});
