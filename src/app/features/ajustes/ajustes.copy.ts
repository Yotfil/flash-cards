// Textos de la pantalla Ajustes, centralizados (ADR 0002: copy por feature).
export const AJUSTES_COPY = {
  title: 'Ajustes',
  session: {
    heading: 'Sesión',
    signedInAs: 'Sesión iniciada como',
  },
  study: {
    heading: 'Estudio',
    newCardsLabel: 'Tarjetas nuevas por día (por defecto)',
    newCardsHelp:
      'Con cuántas tarjetas nuevas se crea cada libro. Cada nueva genera varios repasos futuros: si se te acumula trabajo, baja este número. Cada libro puede ajustarlo aparte.',
    newCardsInvalid: 'Escribe un número entre 0 y 999.',
    save: 'Guardar',
    saving: 'Guardando…',
    saved: 'Guardado.',
    autoGradeLabel: 'Sugerir calificación por tiempo',
    autoGradeHelp:
      'Al revelar la respuesta, resalta un cerebro según tu velocidad de recuerdo. Tú confirmas o eliges otro; nunca califica solo.',
  },
  studyDay: {
    heading: 'Día de estudio',
    timeZoneLabel: 'Zona horaria',
    deviceDiffers: (zone: string) => `Tu dispositivo está en ${zone}.`,
    useDeviceZone: 'Usar esta zona',
    startHourLabel: 'El día empieza a las',
    startHourHelp: 'Lo que estudies antes de esa hora cuenta para el día anterior.',
  },
  appearance: {
    heading: 'Apariencia',
    themeLabel: 'Tema',
    themes: { dark: 'Oscuro', light: 'Claro', system: 'Sistema' },
  },
  saveError: 'No se pudo guardar. Inténtalo de nuevo.',
  signOut: 'Cerrar sesión',
  signingOut: 'Cerrando sesión…',
} as const;
