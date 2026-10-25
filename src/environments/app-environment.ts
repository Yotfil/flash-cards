import type { FirebaseOptions } from 'firebase/app';

// Forma común de los dos entornos. Angular sustituye `environment.ts` por
// `environment.production.ts` en el build de producción (`fileReplacements` en angular.json).
//
// NOTA sobre secretos: la config WEB de Firebase (apiKey, appId, …) NO es un secreto: viaja al
// navegador y se protege con las reglas de seguridad, no ocultándola. Por eso vive versionada.
// Los secretos reales de servidor (fases con IA) irán en un `.env` ignorado; ver `.env.example`.
export interface AppEnvironment {
  readonly production: boolean;
  readonly firebase: FirebaseOptions;
  /** Emuladores locales a los que conectarse; `null` = la nube (solo producción). */
  readonly emulators: {
    readonly firestore: { readonly host: string; readonly port: number };
    readonly auth: { readonly url: string };
  } | null;
}
