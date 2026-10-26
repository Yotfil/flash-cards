import { BrowserFileDeliveryAdapter, type SharingNavigator } from './browser-file-delivery.adapter';

const FILE = { name: 'x.txt', content: '# Uno\na | b\n' };

function adapter(navigator: SharingNavigator = {}) {
  const url = {
    createObjectURL: vi.fn(() => 'blob:exportado'),
    revokeObjectURL: vi.fn(),
  };
  return { delivery: new BrowserFileDeliveryAdapter({ navigator, document, url }), url };
}

describe('BrowserFileDeliveryAdapter', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sin compartir en el navegador, no ofrece compartir archivos', () => {
    expect(adapter().delivery.canShareFiles()).toBe(false);
  });

  it('pregunta al navegador con un archivo de texto', () => {
    const canShare = vi.fn<(data: ShareData) => boolean>(() => true);

    expect(adapter({ canShare, share: vi.fn() }).delivery.canShareFiles()).toBe(true);
    const files = canShare.mock.calls[0]?.[0]?.files as File[];
    expect(files[0]?.type).toContain('text/plain');
  });

  it('comparte el archivo con su nombre y su contenido', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>(async () => undefined);

    expect(await adapter({ share }).delivery.share(FILE)).toBe('shared');
    const data = share.mock.calls[0]?.[0];
    const file = data?.files?.[0];
    expect(file?.name).toBe('x.txt');
    expect(await file?.text()).toBe(FILE.content);
    expect(data?.title).toBe('x.txt');
  });

  it('cerrar la hoja sin elegir es "cancelado"; otro fallo se propaga', async () => {
    const abort = vi.fn(async () => {
      throw new DOMException('cancelado', 'AbortError');
    });
    expect(await adapter({ share: abort }).delivery.share(FILE)).toBe('cancelled');

    const broken = vi.fn(async () => {
      throw new Error('no se pudo');
    });
    await expect(adapter({ share: broken }).delivery.share(FILE)).rejects.toThrow('no se pudo');
  });

  it('descargar crea un enlace con el nombre, lo pulsa y libera la URL', async () => {
    const clicked: { download: string; href: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({ download: this.download, href: this.href });
    });
    const { delivery, url } = adapter();

    await delivery.download(FILE);

    expect(clicked).toEqual([{ download: 'x.txt', href: 'blob:exportado' }]);
    expect(url.revokeObjectURL).toHaveBeenCalledWith('blob:exportado');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('copiar delega en el portapapeles; sin portapapeles, falla', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(async () => undefined);
    await adapter({ clipboard: { writeText } }).delivery.copyText('hola');
    expect(writeText).toHaveBeenCalledWith('hola');

    await expect(adapter().delivery.copyText('hola')).rejects.toThrow();
  });
});
