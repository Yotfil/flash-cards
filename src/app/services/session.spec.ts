import type { User } from '@domain/models';
import { requireSessionUid, requireSessionUser } from './session';

const USER: User = {
  id: 'uid-1',
  displayName: 'Estudiante',
  email: 'e@ejemplo.com',
  createdAt: new Date(),
  settings: {
    timezone: 'America/Bogota',
    dayStartHour: 4,
    theme: 'system',
    defaultNewCardsPerDay: 20,
    autoGradeByTime: true,
  },
  isSearchable: false,
};

describe('requireSessionUser / requireSessionUid', () => {
  it('devuelve el usuario (y su uid) cuando hay sesión', () => {
    expect(requireSessionUser(USER)).toBe(USER);
    expect(requireSessionUid(USER)).toBe('uid-1');
  });

  it('lanza un error explícito sin sesión (null o aún sin resolver)', () => {
    expect(() => requireSessionUser(null)).toThrowError('No hay una sesión activa.');
    expect(() => requireSessionUser(undefined)).toThrowError('No hay una sesión activa.');
    expect(() => requireSessionUid(null)).toThrowError('No hay una sesión activa.');
  });
});
