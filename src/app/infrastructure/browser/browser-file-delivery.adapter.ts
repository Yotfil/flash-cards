import { FileDeliveryPort, type TextFile } from '@domain/ports/file-delivery.port';

/** Lo que el adaptador usa del `navigator`: compartir y portapapeles pueden no existir. */
export interface SharingNavigator {
  readonly canShare?: (data: ShareData) => boolean;
  readonly share?: (data: ShareData) => Promise<void>;
  readonly clipboard?: { writeText(text: string): Promise<void> };
}

export interface BrowserEnvironment {
  readonly navigator: SharingNavigator;
  readonly document: Document;
  readonly url: {
    createObjectURL(blob: Blob): string;
    revokeObjectURL(url: string): void;
  };
}

const TEXT_TYPE = 'text/plain;charset=utf-8';

// Entrega de archivos con las APIs del navegador: Web Share con archivos (móviles), descarga con
// un enlace efímero (escritorio) y el portapapeles. Recibe su entorno para probarse sin tocar el
// `window` real.
export class BrowserFileDeliveryAdapter extends FileDeliveryPort {
  constructor(private readonly browser: BrowserEnvironment) {
    super();
  }

  canShareFiles(): boolean {
    const { canShare, share } = this.browser.navigator;
    if (!canShare || !share) {
      return false;
    }
    const probe = new File([''], 'prueba.txt', { type: TEXT_TYPE });
    return canShare.call(this.browser.navigator, { files: [probe] });
  }

  async share(file: TextFile): Promise<'shared' | 'cancelled'> {
    const { share } = this.browser.navigator;
    if (!share) {
      throw new Error('Este navegador no puede compartir archivos.');
    }
    try {
      await share.call(this.browser.navigator, { files: [toFile(file)], title: file.name });
      return 'shared';
    } catch (error) {
      // Cerrar la hoja sin elegir destino no es un fallo.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
      throw error;
    }
  }

  async download(file: TextFile): Promise<void> {
    const href = this.browser.url.createObjectURL(new Blob([file.content], { type: TEXT_TYPE }));
    const link = this.browser.document.createElement('a');
    link.href = href;
    link.download = file.name;
    link.click();
    this.browser.url.revokeObjectURL(href);
  }

  async copyText(text: string): Promise<void> {
    const { clipboard } = this.browser.navigator;
    if (!clipboard) {
      throw new Error('El portapapeles no está disponible.');
    }
    await clipboard.writeText(text);
  }
}

function toFile(file: TextFile): File {
  return new File([file.content], file.name, { type: TEXT_TYPE });
}
