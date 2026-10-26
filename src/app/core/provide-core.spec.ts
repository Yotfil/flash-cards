import { TestBed } from '@angular/core/testing';

import { SchedulingPort } from '@domain/ports/scheduling.port';
import { ThemePort } from '@domain/ports/theme.port';
import { TsFsrsSchedulingAdapter } from '@infrastructure/scheduling/ts-fsrs-scheduling.adapter';
import { SessionService } from '@services/session/session.service';
import { FakeSessionService } from '@testing/fake-session';
import { FakeThemePort } from '@testing/fake-theme-port';

import { provideCore } from './provide-core';

// La raíz de composición enlaza cada puerto con su adaptador. El inicializador de la app arrastra
// el tema y la sesión: se sustituyen por fakes para no arrancar Firebase ni tocar el navegador.
describe('provideCore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideCore(),
        { provide: SessionService, useValue: new FakeSessionService({ kind: 'signedOut' }) },
        { provide: ThemePort, useValue: new FakeThemePort() },
      ],
    });
  });

  it('el puerto de programación es el adaptador de ts-fsrs', () => {
    expect(TestBed.inject(SchedulingPort)).toBeInstanceOf(TsFsrsSchedulingAdapter);
  });
});
