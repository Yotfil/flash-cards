import { readProjectJson } from './read-project-file';

// La app se instala como "Cadence", en español, sin la interfaz del navegador, con el lienzo
// oscuro como color de tema y fondo, y un icono para cada tamaño habitual.

interface WebManifest {
  name: string;
  short_name: string;
  lang: string;
  dir: string;
  display: string;
  scope: string;
  start_url: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
}

const DARK_CANVAS = '#0b0c22';
const ICON_SIZES = [
  '72x72',
  '96x96',
  '128x128',
  '144x144',
  '152x152',
  '192x192',
  '384x384',
  '512x512',
];

describe('manifest.webmanifest', () => {
  const manifest = readProjectJson('public/manifest.webmanifest') as WebManifest;

  it('se llama Cadence, en español y de izquierda a derecha', () => {
    expect(manifest.name).toBe('Cadence');
    expect(manifest.short_name).toBe('Cadence');
    expect(manifest.lang).toBe('es');
    expect(manifest.dir).toBe('ltr');
  });

  it('abre en la raíz sin la interfaz del navegador', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.scope).toBe('./');
    expect(manifest.start_url).toBe('./');
  });

  it('usa el lienzo oscuro como color de tema y de fondo', () => {
    expect(manifest.theme_color).toBe(DARK_CANVAS);
    expect(manifest.background_color).toBe(DARK_CANVAS);
  });

  it('declara ocho iconos PNG enmascarables y normales, uno por tamaño', () => {
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(ICON_SIZES);
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
      expect(icon.purpose).toBe('maskable any');
    }
  });
});
