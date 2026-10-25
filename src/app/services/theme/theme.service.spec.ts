import { TestBed } from '@angular/core/testing';

import { ThemePort } from '@domain/ports/theme.port';
import { FakeThemePort } from '@testing/fake-theme-port';

import { ThemeService } from './theme.service';

function setup(themePort: FakeThemePort): ThemeService {
  TestBed.configureTestingModule({ providers: [{ provide: ThemePort, useValue: themePort }] });
  return TestBed.inject(ThemeService);
}

describe('ThemeService', () => {
  it('arranca con la preferencia recordada y la aplica', () => {
    const themePort = new FakeThemePort('light');

    const service = setup(themePort);
    TestBed.tick();

    expect(service.preference()).toBe('light');
    expect(themePort.applied.at(-1)).toBe('light');
  });

  it('sin preferencia recordada sigue al sistema', () => {
    const themePort = new FakeThemePort(null);

    const service = setup(themePort);
    TestBed.tick();

    expect(service.preference()).toBe('system');
    expect(themePort.applied.at(-1)).toBe('system');
  });

  it('cada cambio de preferencia se aplica al documento', () => {
    const themePort = new FakeThemePort(null);
    const service = setup(themePort);
    TestBed.tick();

    service.preference.set('dark');
    TestBed.tick();

    expect(themePort.applied.at(-1)).toBe('dark');
  });
});
