import { readProjectFile } from './read-project-file';

// "Atrás" con un diálogo abierto solo lo cierra: el servicio de diálogos aborta la navegación y
// el router devuelve el historial a su sitio. Eso solo pasa con la restauración 'computed'; con la
// de por defecto ('replace'), la entrada anterior del historial se pisaría con la URL actual.
describe('configuración del router', () => {
  it('restaura el historial de una navegación cancelada', () => {
    const config = readProjectFile('src/app/app.config.ts');

    expect(config).toMatch(/withRouterConfig\(\{\s*canceledNavigationResolution: 'computed'/);
  });
});
