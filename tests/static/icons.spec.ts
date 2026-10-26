import { readFileSync } from 'node:fs';

import { readProjectFile, readProjectJson } from './read-project-file';

// Los iconos de la PWA son el icono Cadence: PNG del tamaño que declara el manifiesto y opacos de
// borde a borde (enmascarables: Android los recorta en círculo e iOS les pone esquinas; una
// esquina transparente se vería negra). El favicon es la misma marca, en baldosa redondeada.

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** Tipo de color del PNG (cabecera IHDR): 2 = RGB, sin canal alfa. */
const PNG_RGB = 2;

interface PngHeader {
  width: number;
  height: number;
  colorType: number;
}

function readPngHeader(path: string): PngHeader {
  const bytes = readFileSync(path);
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${path} no es un PNG.`);
  }
  // Firma (8) + longitud y tipo del bloque IHDR (8): ancho, alto, profundidad y tipo de color.
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25] ?? -1,
  };
}

describe('iconos de la app', () => {
  const manifest = readProjectJson('public/manifest.webmanifest') as {
    icons: { src: string; sizes: string }[];
  };

  it.each(manifest.icons.map((icon) => [icon.src, icon.sizes]))(
    '%s es un PNG opaco de %s',
    (src, sizes) => {
      const header = readPngHeader(`public/${src}`);
      expect(`${header.width}x${header.height}`).toBe(sizes);
      expect(header.colorType).toBe(PNG_RGB);
    },
  );

  it('el favicon es el icono Cadence', () => {
    const favicon = readProjectFile('public/favicon.svg');

    expect(favicon).toMatch(/<svg[^>]*role="img"[^>]*aria-label="Cadence"/);
  });
});
