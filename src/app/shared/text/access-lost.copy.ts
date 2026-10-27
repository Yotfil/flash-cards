// Al usuario le retiraron el acceso con la app abierta: el repaso y la práctica con IA se cierran
// con este aviso (lo ya guardado se conserva) y "Continuar" lleva a la pantalla de sin acceso.
export const ACCESS_LOST_COPY = {
  title: 'Ya no tienes acceso',
  message: 'Lo que calificaste antes quedó guardado.',
  continue: 'Continuar',
} as const;
