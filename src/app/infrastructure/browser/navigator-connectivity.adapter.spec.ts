import { TestBed } from '@angular/core/testing';

import { NavigatorConnectivityAdapter } from './navigator-connectivity.adapter';

describe('NavigatorConnectivityAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function create(): NavigatorConnectivityAdapter {
    TestBed.configureTestingModule({ providers: [NavigatorConnectivityAdapter] });
    return TestBed.inject(NavigatorConnectivityAdapter);
  }

  it('arranca con el estado de red del navegador', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    expect(create().online()).toBe(false);
  });

  it('sigue los eventos offline y online de la ventana', () => {
    const adapter = create();

    window.dispatchEvent(new Event('offline'));
    expect(adapter.online()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(adapter.online()).toBe(true);
  });

  it('deja de escuchar al destruirse', () => {
    const adapter = create();

    TestBed.resetTestingModule();
    window.dispatchEvent(new Event('offline'));

    expect(adapter.online()).toBe(true);
  });
});
