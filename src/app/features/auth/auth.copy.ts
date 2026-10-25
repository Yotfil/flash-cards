import type { AuthErrorKind } from '@domain/models/auth-error';

// Textos de las pantallas de acceso y "sin acceso", centralizados (ADR 0002: copy por feature).

export const AUTH_COPY = {
  brand: 'Cadence',
  signIn: {
    title: 'Iniciar sesión',
    subtitle: 'Retoma tu repaso donde lo dejaste.',
    submit: 'Iniciar sesión',
    submitting: 'Iniciando sesión…',
    switchPrompt: '¿Aún no tienes cuenta?',
    switchAction: 'Crear una',
  },
  register: {
    title: 'Crear cuenta',
    subtitle: 'Empieza a estudiar en minutos.',
    submit: 'Crear cuenta',
    submitting: 'Creando cuenta…',
    switchPrompt: '¿Ya tienes cuenta?',
    switchAction: 'Iniciar sesión',
    earlyAccessNote:
      'Cadence está en acceso anticipado: solo puedes crear cuenta si tu correo está en la lista.',
  },
  fields: {
    displayName: 'Nombre',
    email: 'Correo',
    password: 'Contraseña',
    passwordHint: 'Mínimo 6 caracteres.',
    emailInvalid: 'Escribe un correo válido.',
    passwordInvalid: 'La contraseña necesita al menos 6 caracteres.',
  },
  google: 'Continuar con Google',
  googleConnecting: 'Conectando…',
  separator: 'o',
  notAllowlisted:
    'Este correo no está en la lista de acceso anticipado. Pídele acceso a quien administra la app.',
  profileError: {
    message: 'No pudimos cargar tu perfil.',
    retry: 'Reintentar',
    signOut: 'Cerrar sesión',
  },
  noAccess: {
    title: 'Tu cuenta está pendiente de acceso',
    explanation:
      'Cadence está en acceso anticipado. Iniciaste sesión correctamente, pero tu cuenta todavía no está habilitada para usar la app.',
    shareEmail:
      'Si crees que deberías tener acceso, comparte este correo con quien administra la app.',
    comeBack: 'Cuando te den acceso, vuelve a entrar con Google o crea tu cuenta.',
    signOut: 'Cerrar sesión',
    signingOut: 'Cerrando sesión…',
  },
} as const;

/** Mensaje de cada categoría de fallo; `cancelled` no se muestra (cerrar la ventana no es error). */
export const AUTH_ERROR_MESSAGES: Readonly<Record<Exclude<AuthErrorKind, 'cancelled'>, string>> = {
  invalidCredentials: 'Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.',
  emailInUse: 'Ese correo ya tiene una cuenta. Inicia sesión.',
  offline: 'Sin conexión. Inténtalo cuando vuelva la red.',
  unknown: 'No pudimos completar la acción. Inténtalo de nuevo.',
};
