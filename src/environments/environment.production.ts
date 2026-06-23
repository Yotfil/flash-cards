// Configuración de entorno (producción). Sustituye a `environment.ts` en el build de
// producción vía `fileReplacements` (angular.json). Reemplazar los placeholders por la
// config del proyecto Firebase de producción (puede ser el mismo o uno distinto al de dev).

import type { FirebaseOptions } from 'firebase/app';

export const environment: { production: boolean; firebase: FirebaseOptions } = {
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
};
