import {
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

import { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE } from '@infrastructure/firebase/firebase.tokens';

import type { AppEnvironment } from '../../environments/app-environment';
import { environment } from '../../environments/environment';

// Raíz de composición de Firebase: crea UNA app, Firestore con caché local persistente y
// compartida entre pestañas (la app sigue funcionando sin red y encola las escrituras) y Auth.
// En desarrollo los conecta a los emuladores locales antes de cualquier operación; en producción,
// `environment.emulators` es `null` y hablan con la nube. Firebase arranca la primera vez que un
// adaptador inyecta uno de los tokens.

interface FirebaseServices {
  readonly app: FirebaseApp;
  readonly firestore: Firestore;
  readonly auth: Auth;
}

const FIREBASE_SERVICES = new InjectionToken<FirebaseServices>('FIREBASE_SERVICES');

export function provideFirebase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FIREBASE_SERVICES, useFactory: () => startFirebase(environment) },
    { provide: FIREBASE_APP, useFactory: () => inject(FIREBASE_SERVICES).app },
    { provide: FIRESTORE, useFactory: () => inject(FIREBASE_SERVICES).firestore },
    { provide: FIREBASE_AUTH, useFactory: () => inject(FIREBASE_SERVICES).auth },
  ]);
}

function startFirebase(appEnvironment: AppEnvironment): FirebaseServices {
  const existingApp = getApps()[0];
  if (existingApp) {
    // Recarga en caliente: la app, la caché y los emuladores ya se configuraron la primera vez, y
    // `initializeFirestore` solo admite una llamada por app.
    return { app: existingApp, firestore: getFirestore(existingApp), auth: getAuth(existingApp) };
  }

  const app = initializeApp(appEnvironment.firebase);
  const firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const auth = getAuth(app);

  if (appEnvironment.emulators) {
    const { host, port } = appEnvironment.emulators.firestore;
    connectFirestoreEmulator(firestore, host, port);
    connectAuthEmulator(auth, appEnvironment.emulators.auth.url);
  }

  return { app, firestore, auth };
}
