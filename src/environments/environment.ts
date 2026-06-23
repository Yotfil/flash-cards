// Configuración de entorno (desarrollo). Angular usa `environment.production.ts` en el
// build de producción (ver `fileReplacements` en angular.json).
//
// NOTA sobre secretos: la config WEB de Firebase (apiKey, appId, …) NO es un secreto: se
// envía al navegador y se protege con las reglas de seguridad de Firestore, no ocultándola.
// Por eso vive aquí (versionada). Los secretos REALES de servidor (claves de admin/Cloud
// Functions, Fase 3) irán en un `.env` ignorado por git; ver `.env.example`.
//
// Scaffold con valores de ejemplo: reemplazar por la config de tu proyecto Firebase.

import type { FirebaseOptions } from 'firebase/app';

export const environment: { production: boolean; firebase: FirebaseOptions } = {
  production: false,
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
