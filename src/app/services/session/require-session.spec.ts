import { aUser } from '@testing/fake-user-repository';

import { requireSessionUid, requireSessionUser } from './require-session';

describe('sesión requerida', () => {
  it('sin usuario lanza un error explícito', () => {
    expect(() => requireSessionUser(null)).toThrow('No hay una sesión activa.');
    expect(() => requireSessionUser(undefined)).toThrow('No hay una sesión activa.');
  });

  it('con usuario lo devuelve', () => {
    const user = aUser({ id: 'u7' });

    expect(requireSessionUser(user)).toBe(user);
  });

  it('devuelve el identificador del usuario con sesión', () => {
    expect(requireSessionUid(aUser({ id: 'u7' }))).toBe('u7');
    expect(() => requireSessionUid(null)).toThrow('No hay una sesión activa.');
  });
});
