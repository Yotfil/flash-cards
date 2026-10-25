// Arranca los emuladores de Firestore y Auth (proyecto de demostración `demo-cadence`) con datos
// que sobreviven entre arranques: al salir con Ctrl+C se exportan a `.emulator-data/` y al volver
// a arrancar se importan. El import solo se pide si ya hubo una exportación, porque importar una
// carpeta vacía hace fallar el arranque.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIRECTORY = '.emulator-data';

mkdirSync(DATA_DIRECTORY, { recursive: true });
const hasExport = existsSync(join(DATA_DIRECTORY, 'firebase-export-metadata.json'));

const args = [
  'emulators:start',
  '--only',
  'firestore,auth',
  '--project',
  'demo-cadence',
  '--export-on-exit',
  DATA_DIRECTORY,
  ...(hasExport ? ['--import', DATA_DIRECTORY] : []),
];

const emulators = spawn('firebase', args, { stdio: 'inherit' });

// Ctrl+C llega también a los emuladores, que exportan antes de salir: este envoltorio espera a
// que terminen en lugar de cortarlos a mitad de la exportación.
process.on('SIGINT', () => {});
process.on('SIGTERM', () => emulators.kill('SIGTERM'));
emulators.on('exit', (code) => process.exit(code ?? 0));
