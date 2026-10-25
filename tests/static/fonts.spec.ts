import { readProjectFile, readProjectJson } from './read-project-file';

// Plus Jakarta Sans autohospedada: la app no pide fuentes a ningún dominio externo (funciona sin
// red y no filtra visitas a terceros).

const EXTERNAL_FONT_HOSTS =
  /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|fonts\.bunny\.net/;

interface AngularJson {
  projects: Record<string, { architect: { build: { options: { styles: string[] } } } }>;
}

describe('fuentes', () => {
  it('ni el documento ni el tema enlazan fuentes externas', () => {
    expect(readProjectFile('src/index.html')).not.toMatch(EXTERNAL_FONT_HOSTS);
    expect(readProjectFile('src/styles.scss')).not.toMatch(EXTERNAL_FONT_HOSTS);
  });

  it('la familia del tema es Plus Jakarta Sans', () => {
    expect(readProjectFile('src/styles.scss')).toMatch(/--font-sans: 'Plus Jakarta Sans'/);
  });

  it('el build incluye los pesos autohospedados de @fontsource', () => {
    const angularJson = readProjectJson('angular.json') as AngularJson;
    const styles = angularJson.projects['flash-cards']?.architect.build.options.styles ?? [];

    expect(
      styles.filter((style) => style.startsWith('@fontsource/plus-jakarta-sans/')),
    ).not.toEqual([]);
  });
});
