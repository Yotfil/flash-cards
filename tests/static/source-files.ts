import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Lista recursiva de los archivos de una carpeta del proyecto (rutas relativas a la raíz).
export function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}
