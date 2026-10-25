import { AuthError } from '@domain/models/auth-error';

import { toAuthError } from './auth-error.mapper';

describe('toAuthError', () => {
  it.each([
    ['auth/invalid-credential', 'invalidCredentials'],
    ['auth/wrong-password', 'invalidCredentials'],
    ['auth/user-not-found', 'invalidCredentials'],
    ['auth/invalid-email', 'invalidCredentials'],
    ['auth/email-already-in-use', 'emailInUse'],
    ['auth/network-request-failed', 'offline'],
    ['auth/popup-closed-by-user', 'cancelled'],
    ['auth/cancelled-popup-request', 'cancelled'],
    ['auth/too-many-requests', 'unknown'],
    ['algo-inesperado', 'unknown'],
  ])('%s → %s', (code, kind) => {
    expect(toAuthError(code, new Error(code)).kind).toBe(kind);
  });

  it('conserva el error original como causa', () => {
    const cause = new Error('auth/wrong-password');

    const error = toAuthError('auth/wrong-password', cause);

    expect(error).toBeInstanceOf(AuthError);
    expect(error.cause).toBe(cause);
  });
});
