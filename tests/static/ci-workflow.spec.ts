import { readProjectFile } from './read-project-file';

// La CI solo lee el código y corre comandos: su token no necesita escribir nada en el repositorio.
// Sin `permissions:`, GitHub le da los permisos por defecto del repo, que pueden incluir escritura.

describe('workflow de CI', () => {
  const workflow = readProjectFile('.github/workflows/ci.yml');

  it('el token del workflow solo puede leer el contenido', () => {
    expect(workflow).toMatch(/^permissions:\n {2}contents: read\n/m);
  });
});
