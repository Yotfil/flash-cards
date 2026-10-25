import { readProjectFile } from './read-project-file';
import { listFiles } from './source-files';

// El valor por defecto de "sugerir calificación por tiempo" tiene una sola fuente: la constante
// del dominio. Ni la creación del perfil, ni la lectura de perfiles antiguos, ni ninguna pantalla
// lo repiten con un literal.

const SOURCES = listFiles('src/app').filter(
  (path) => /\.ts$/.test(path) && !path.endsWith('.spec.ts'),
);

describe('fuente única del default de la sugerencia por tiempo', () => {
  it('ningún archivo de la app rellena autoGradeByTime con un literal', () => {
    const offenders = SOURCES.filter((path) =>
      /autoGradeByTime\s*\?\?\s*(true|false)/.test(readProjectFile(path)),
    );

    expect(offenders).toEqual([]);
  });

  it('el esquema del perfil y la creación del perfil usan la constante del dominio', () => {
    expect(readProjectFile('src/app/infrastructure/firestore/schemas/user.schema.ts')).toContain(
      '.default(DEFAULT_AUTO_GRADE_BY_TIME)',
    );
    expect(readProjectFile('src/app/services/session/session.service.ts')).toContain(
      'autoGradeByTime: DEFAULT_AUTO_GRADE_BY_TIME',
    );
  });
});
