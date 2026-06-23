// Inicialización de Firebase para la app. Es el único lugar que arranca el SDK; el resto
// del código recibe `Firestore`/`Auth` por inyección (tokens en @infrastructure/firebase).
//
// Se usa el SDK web de Firebase directamente (decisión en la bitácora), envuelto detrás de
// los puertos del dominio en `infrastructure/`. Nada fuera de esa capa debería importar
// 'firebase/*'.

import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import { environment } from '../../../environments/environment';
import { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE } from '@infrastructure/firebase';

/**
 * Registra la app de Firebase y sus servicios (Firestore, Auth) en el inyector de la
 * aplicación. Se reutiliza la app existente si ya hubiera una (evita el error de doble
 * inicialización en recargas en caliente).
 */
export function provideFirebase(): EnvironmentProviders {
  const isFirstInit = getApps().length === 0;
  const app = isFirstInit ? initializeApp(environment.firebase) : getApp();

  // Persistencia offline (IndexedDB, multi-pestaña): "offline como modo", no error. Los datos
  // leídos quedan en caché y las escrituras se encolan y sincronizan al recuperar conexión.
  // initializeFirestore solo puede llamarse una vez; en recargas en caliente se reutiliza.
  const firestore = isFirstInit
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      })
    : getFirestore(app);

  const auth = getAuth(app);

  return makeEnvironmentProviders([
    { provide: FIREBASE_APP, useValue: app },
    { provide: FIRESTORE, useValue: firestore },
    { provide: FIREBASE_AUTH, useValue: auth },
  ]);
}
