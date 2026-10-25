import { readFileSync } from 'node:fs';

// Las pruebas estáticas leen archivos de configuración de la raíz del proyecto (el runner de
// integración arranca en ella) y afirman los valores que exige la spec, no su formato.

export function readProjectFile(path: string): string {
  return readFileSync(path, 'utf8');
}

export function readProjectJson(path: string): unknown {
  return JSON.parse(readProjectFile(path));
}
