import { authFormSchema } from './auth-form.schema';

const VALID = { email: 'ada@ejemplo.com', password: 'secreta', displayName: '' };

describe('authFormSchema', () => {
  it('acepta un correo válido, una contraseña de 6 y un nombre vacío', () => {
    expect(authFormSchema.safeParse(VALID).success).toBe(true);
  });

  it('rechaza un correo sin arroba', () => {
    const result = authFormSchema.safeParse({ ...VALID, email: 'correo-sin-arroba' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['email']);
  });

  it('rechaza una contraseña de 5 caracteres', () => {
    const result = authFormSchema.safeParse({ ...VALID, password: '12345' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['password']);
  });
});
