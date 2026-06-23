// Tokens de inyección para las instancias de Firebase. Los adaptadores de
// `infrastructure/` inyectan estos tokens en vez de inicializar Firebase ellos mismos:
// el arranque vive en un solo sitio (la raíz de composición, `core/`).

import { InjectionToken } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
