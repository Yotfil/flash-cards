import type { AppEnvironment } from './app-environment';

// Producción: el proyecto real de Firebase, sin emuladores. Sustituye a `environment.ts` en el
// build de producción. Para probar contra datos reales en local se sirve este build
// (`npm run build` + un servidor estático), nunca `ng serve`.
export const environment: AppEnvironment = {
  production: true,
  firebase: {
    apiKey: 'AIzaSyAT0E3EOdiahojXsc77VcWoU1HCiCDcpBA',
    authDomain: 'flash-cards-aca86.firebaseapp.com',
    projectId: 'flash-cards-aca86',
    storageBucket: 'flash-cards-aca86.firebasestorage.app',
    messagingSenderId: '81589294819',
    appId: '1:81589294819:web:2ee787fec13933b81f17d6',
    measurementId: 'G-SHWLLCESP7',
  },
  emulators: null,
};
