import { InjectionToken } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// Instancias únicas de Firebase que los adaptadores inyectan. Las crea `provideFirebase()` en la
// raíz de composición (core); aquí solo se declaran, porque son el detalle que infrastructure/
// consume y ninguna otra capa debe conocer.

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
