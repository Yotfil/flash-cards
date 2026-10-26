import { existsSync } from 'node:fs';

import { readProjectFile } from './read-project-file';

// Los secretos reales de servidor viven en un `.env` que nunca se versiona; `.env.example`
// documenta las variables sin valores.

describe('archivos de entorno', () => {
  it('existe la plantilla versionada .env.example', () => {
    expect(existsSync('.env.example')).toBe(true);
  });

  it('.gitignore excluye el .env real', () => {
    const ignoredPatterns = readProjectFile('.gitignore')
      .split('\n')
      .map((line) => line.trim());

    expect(ignoredPatterns).toContain('.env');
  });
});
