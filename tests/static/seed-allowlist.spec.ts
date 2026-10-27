import { readProjectFile } from './read-project-file';

// Firebase Auth guarda los correos en minúsculas y la app compara la lista de forma literal: el
// guion que autoriza un correo en el emulador lo escribe recortado y en minúsculas, como lo
// entregará el proveedor, aunque se teclee con mayúsculas.
describe('seed:allowlist', () => {
  it('normaliza el correo antes de escribirlo en la lista', () => {
    const script = readProjectFile('scripts/seed-allowlist.mjs');

    expect(script).toMatch(/process\.argv\[2\]\?\.trim\(\)\.toLowerCase\(\)/);
  });
});
