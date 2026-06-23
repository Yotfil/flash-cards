// Configuración de entorno (producción). Sustituye a `environment.ts` en el build de
// producción vía `fileReplacements` (angular.json). Reemplazar los placeholders por la
// config del proyecto Firebase de producción (puede ser el mismo o uno distinto al de dev).

import type { FirebaseOptions } from 'firebase/app';

export const environment: { production: boolean; firebase: FirebaseOptions } = {
  production: true,
  firebase: {
    apiKey: 'REEMPLAZAR_API_KEY',
    authDomain: 'REEMPLAZAR_PROJECT_ID.firebaseapp.com',
    projectId: 'REEMPLAZAR_PROJECT_ID',
    storageBucket: 'REEMPLAZAR_PROJECT_ID.appspot.com',
    messagingSenderId: 'REEMPLAZAR_SENDER_ID',
    appId: 'REEMPLAZAR_APP_ID',
  },
};
