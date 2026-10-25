import { TestBed } from '@angular/core/testing';

import { Logger } from '@domain/ports/logger.port';
import { FakeLogger } from '@testing/fake-logger';

import { DocumentThemeAdapter, THEME_STORAGE_KEY } from './document-theme.adapter';

describe('DocumentThemeAdapter', () => {
  let logger: FakeLogger;
  let adapter: DocumentThemeAdapter;

  beforeEach(() => {
    logger = new FakeLogger();
    TestBed.configureTestingModule({
      providers: [DocumentThemeAdapter, { provide: Logger, useValue: logger }],
    });
    adapter = TestBed.inject(DocumentThemeAdapter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it('aplicar oscuro fija el atributo de tema y lo recuerda', () => {
    adapter.apply('dark');

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('aplicar sistema quita el atributo para que mande la preferencia del sistema', () => {
    adapter.apply('light');

    adapter.apply('system');

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('devuelve la preferencia recordada', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    expect(adapter.remembered()).toBe('light');
  });

  it('ignora un valor recordado que no es una preferencia válida', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

    expect(adapter.remembered()).toBeNull();
  });

  it('sin nada recordado devuelve null', () => {
    expect(adapter.remembered()).toBeNull();
  });

  it('si el almacenamiento del navegador falla, aplica igual y avisa por el registro', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    adapter.apply('dark');
    const remembered = adapter.remembered();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(remembered).toBeNull();
    expect(logger.entries.filter((entry) => entry.level === 'warn')).toHaveLength(2);
  });
});
