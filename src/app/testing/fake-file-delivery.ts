import { FileDeliveryPort, type TextFile } from '@domain/ports/file-delivery.port';

// Fake de la entrega de archivos: `canShare` decide qué ofrece la pantalla; registra cada llamada
// y responde lo que la prueba programe (`shareResult`, o un fallo en `failWith`).
export class FakeFileDelivery extends FileDeliveryPort {
  canShare = false;
  shareResult: 'shared' | 'cancelled' = 'shared';
  failWith: Partial<Record<'share' | 'download' | 'copyText', unknown>> = {};
  /** Si existe, la entrega espera a que se cumpla (para probar el estado ocupado). */
  gate: Promise<void> | null = null;
  readonly shared: TextFile[] = [];
  readonly downloaded: TextFile[] = [];
  readonly copied: string[] = [];

  canShareFiles(): boolean {
    return this.canShare;
  }

  async share(file: TextFile): Promise<'shared' | 'cancelled'> {
    this.shared.push(file);
    await this.wait('share');
    return this.shareResult;
  }

  async download(file: TextFile): Promise<void> {
    this.downloaded.push(file);
    await this.wait('download');
  }

  async copyText(text: string): Promise<void> {
    this.copied.push(text);
    await this.wait('copyText');
  }

  private async wait(method: 'share' | 'download' | 'copyText'): Promise<void> {
    if (this.gate) {
      await this.gate;
    }
    if (method in this.failWith) {
      throw this.failWith[method];
    }
  }
}
