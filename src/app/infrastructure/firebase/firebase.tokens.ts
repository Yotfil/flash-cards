// Tokens de inyección para las instancias del SDK de Firebase. Viven en infrastructure
// porque son un detalle de infraestructura: los adaptadores los inyectan, y la raíz de
// composición (`core/`) los enlaza con las instancias concretas en el arranque.

import { InjectionToken } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
