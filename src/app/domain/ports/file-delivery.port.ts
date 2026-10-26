/** Un archivo de texto a entregar (UTF-8). */
export interface TextFile {
  readonly name: string;
  readonly content: string;
}

// Entregar un archivo o un texto fuera de la app: compartir con la hoja del sistema, descargar o
// copiar al portapapeles. Detrás de un puerto para probar la pantalla sin un navegador real.
export abstract class FileDeliveryPort {
  /** ¿Este navegador puede compartir archivos con la hoja del sistema? */
  abstract canShareFiles(): boolean;
  /** Abre la hoja de compartir; cerrarla sin elegir destino es `'cancelled'`, no un error. */
  abstract share(file: TextFile): Promise<'shared' | 'cancelled'>;
  abstract download(file: TextFile): Promise<void>;
  /** Lanza si el portapapeles no está disponible. */
  abstract copyText(text: string): Promise<void>;
}
