import type { AppEnvironment } from './app-environment';

// Desarrollo: la app habla SOLO con los emuladores locales (`npm run emulators`). El proyecto
// `demo-cadence` no existe en la nube: Firebase trata los identificadores `demo-*` como
// solo-emulador, así que un `connect…Emulator` olvidado falla en vez de tocar datos reales.
// Las claves son de relleno: los emuladores no las validan.
export const environment: AppEnvironment = {
  production: false,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-cadence.firebaseapp.com',
    projectId: 'demo-cadence',
    appId: 'demo-app-id',
  },
  emulators: {
    firestore: { host: '127.0.0.1', port: 8080 },
    auth: { url: 'http://127.0.0.1:9099' },
  },
};
