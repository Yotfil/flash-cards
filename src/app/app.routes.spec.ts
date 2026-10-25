import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { SessionState } from '@domain/models/session-state';
import { BookRepository } from '@domain/ports/book.repository';
import { CardRepository } from '@domain/ports/card.repository';
import { ChapterRepository } from '@domain/ports/chapter.repository';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { DailyStatsRepository } from '@domain/ports/daily-stats.repository';
import { FileDeliveryPort } from '@domain/ports/file-delivery.port';
import { GradePersistencePort } from '@domain/ports/grade-persistence.port';
import { ImportRepository } from '@domain/ports/import.repository';
import { Logger } from '@domain/ports/logger.port';
import { PracticePackageRepository } from '@domain/ports/practice-package.repository';
import { SchedulingPort } from '@domain/ports/scheduling.port';
import { ThemePort } from '@domain/ports/theme.port';
import { PracticeHandoffService } from '@services/practice/practice-handoff.service';
import { PracticeAiHandoffService } from '@services/practice-ai/practice-ai-handoff.service';
import { StudyHandoffService } from '@services/queue/study-handoff.service';
import { SessionService } from '@services/session/session.service';
import { FakeBookRepository } from '@testing/fake-book-repository';
import { aCard } from '@testing/fake-card-repository';
import { FakeCardRepository } from '@testing/fake-card-repository';
import { FakeChapterRepository } from '@testing/fake-chapter-repository';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeDailyStatsRepository } from '@testing/fake-daily-stats-repository';
import { FakeGradePersistence } from '@testing/fake-grade-persistence';
import { FakeFileDelivery } from '@testing/fake-file-delivery';
import { FakeImportRepository } from '@testing/fake-import-repository';
import { FakeLogger } from '@testing/fake-logger';
import { FakePracticePackageRepository, anItem } from '@testing/fake-practice-package-repository';
import { FakeSchedulingPort } from '@testing/fake-scheduling-port';
import { FakeSessionService } from '@testing/fake-session';
import { FakeThemePort } from '@testing/fake-theme-port';
import { aUser } from '@testing/fake-user-repository';

import { routes } from './app.routes';

const ACTIVE: SessionState = { kind: 'active', user: aUser() };
const SIGNED_OUT: SessionState = { kind: 'signedOut' };
const NO_ACCESS: SessionState = { kind: 'noAccess', email: 'nuevo@ejemplo.com' };

async function navigate(
  url: string,
  session: SessionState = ACTIVE,
  options: { handOff?: boolean } = {},
): Promise<{ element: HTMLElement; finalUrl: string }> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: ConnectivityPort, useValue: new FakeConnectivity() },
      { provide: SessionService, useValue: new FakeSessionService(session) },
      { provide: Logger, useValue: new FakeLogger() },
      { provide: ThemePort, useValue: new FakeThemePort() },
      { provide: BookRepository, useValue: new FakeBookRepository() },
      { provide: ChapterRepository, useValue: new FakeChapterRepository() },
      { provide: CardRepository, useValue: new FakeCardRepository() },
      { provide: DailyStatsRepository, useValue: new FakeDailyStatsRepository() },
      { provide: SchedulingPort, useValue: new FakeSchedulingPort() },
      { provide: GradePersistencePort, useValue: new FakeGradePersistence() },
      { provide: ImportRepository, useValue: new FakeImportRepository() },
      { provide: PracticePackageRepository, useValue: new FakePracticePackageRepository() },
      { provide: FileDeliveryPort, useValue: new FakeFileDelivery() },
    ],
  });
  if (options.handOff) {
    if (url === '/practica-ia') {
      TestBed.inject(PracticeAiHandoffService).hand({
        packageId: 'p1',
        dayId: '2026-10-25',
        items: [anItem({ id: 'i1', front: 'to call it a day' })],
      });
    } else if (url === '/practicar') {
      TestBed.inject(PracticeHandoffService).hand({
        questions: [
          { id: 'q1', cardId: 'k1', type: 'written', prompt: 'to give up', answer: 'rendirse' },
        ],
        origin: { kind: 'book', bookId: 'b1' },
      });
    } else {
      TestBed.inject(StudyHandoffService).hand({ cards: [aCard()], source: { kind: 'today' } });
    }
  }
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  harness.detectChanges();
  return {
    element: harness.fixture.nativeElement as HTMLElement,
    finalUrl: TestBed.inject(Router).url,
  };
}

const SHELL_ROUTES = [
  '/hoy',
  '/biblioteca',
  '/importar',
  '/biblioteca/b1',
  '/biblioteca/b1/c1',
  '/paquetes/completados',
  '/paquetes/p1',
  '/progreso',
  '/ajustes',
];

describe('mapa de rutas', () => {
  it('abrir la app lleva a Hoy', async () => {
    expect((await navigate('/')).finalUrl).toBe('/hoy');
  });

  it('una URL inexistente lleva a Hoy', async () => {
    expect((await navigate('/esto-no-existe')).finalUrl).toBe('/hoy');
  });

  it.each(SHELL_ROUTES)('%s se pinta dentro del caparazón, con la navegación', async (url) => {
    const { element, finalUrl } = await navigate(url);

    expect(finalUrl).toBe(url);
    expect(element.querySelector('app-shell app-main-nav nav')).not.toBeNull();
    expect(element.querySelector('app-shell main router-outlet + *')).not.toBeNull();
  });

  it.each([
    ['/login', SIGNED_OUT],
    ['/sin-acceso', NO_ACCESS],
    ['/repaso', ACTIVE],
    ['/practicar', ACTIVE],
    ['/practica-ia', ACTIVE],
  ] as const)('%s se pinta a pantalla completa, sin navegación', async (url, session) => {
    const { element, finalUrl } = await navigate(url, session, {
      handOff: url === '/repaso' || url === '/practicar' || url === '/practica-ia',
    });

    expect(finalUrl).toBe(url);
    expect(element.querySelector('app-main-nav')).toBeNull();
  });
});

describe('pantallas de acceso', () => {
  it('/login pinta la pantalla de acceso', async () => {
    const { element } = await navigate('/login', SIGNED_OUT);

    expect(element.querySelector('app-login-page h1')?.textContent?.trim()).toBe('Iniciar sesión');
  });
});

describe('pantallas de las secciones', () => {
  it('/hoy pinta Hoy dentro del caparazón', async () => {
    const { element } = await navigate('/hoy');

    expect(element.querySelector('app-shell main app-hoy-page h1')?.textContent?.trim()).toBe(
      'Hoy',
    );
  });

  it('/practicar con una práctica entregada pinta la práctica, sin la navegación principal', async () => {
    const { element } = await navigate('/practicar', ACTIVE, { handOff: true });

    expect(element.querySelector('app-practica-page app-written-question')?.textContent).toContain(
      'to give up',
    );
    expect(element.querySelector('app-main-nav')).toBeNull();
  });

  it('/practicar sin una práctica entregada (recarga, URL directa, "atrás") vuelve a la Biblioteca', async () => {
    expect((await navigate('/practicar')).finalUrl).toBe('/biblioteca');
  });

  it('/paquetes/completados pinta el historial y /paquetes/:id el detalle del paquete', async () => {
    const history = await navigate('/paquetes/completados');
    expect(
      history.element.querySelector('app-shell main app-completed-packages-page h1')?.textContent,
    ).toContain('Paquetes completados');
    TestBed.resetTestingModule();

    const detail = await navigate('/paquetes/p1');
    expect(detail.element.querySelector('app-shell main app-package-detail-page')).not.toBeNull();
  });

  it('/practica-ia sin una práctica entregada vuelve a la Biblioteca', async () => {
    expect((await navigate('/practica-ia')).finalUrl).toBe('/biblioteca');
  });

  it('/progreso pinta Progreso dentro del caparazón', async () => {
    const { element } = await navigate('/progreso');

    expect(element.querySelector('app-shell main app-progreso-page h1')?.textContent?.trim()).toBe(
      'Progreso',
    );
  });

  it('/repaso con una lista entregada pinta la sesión, sin la navegación principal', async () => {
    const { element } = await navigate('/repaso', ACTIVE, { handOff: true });

    expect(element.querySelector('app-repaso-page app-flip-card')).not.toBeNull();
    expect(element.querySelector('app-main-nav')).toBeNull();
  });

  it('/repaso sin una lista entregada (recarga, URL directa, "atrás") vuelve a Hoy', async () => {
    expect((await navigate('/repaso')).finalUrl).toBe('/hoy');
  });

  it('/biblioteca pinta la Biblioteca y /biblioteca/b1 el detalle, dentro del caparazón', async () => {
    const library = await navigate('/biblioteca');
    expect(library.element.querySelector('app-shell main app-biblioteca-page')).not.toBeNull();
    TestBed.resetTestingModule();

    const detail = await navigate('/biblioteca/b1');
    expect(detail.element.querySelector('app-shell main app-libro-detail-page')).not.toBeNull();
    TestBed.resetTestingModule();

    const chapter = await navigate('/biblioteca/b1/c1');
    expect(chapter.element.querySelector('app-shell main app-capitulo-detail-page')).not.toBeNull();
  });

  it('/importar pinta "Importar un libro" dentro del caparazón', async () => {
    const { element } = await navigate('/importar');

    expect(
      element.querySelector('app-shell main app-importar-libro-page h1')?.textContent?.trim(),
    ).toBe('Importar un libro');
  });

  it('/ajustes pinta Ajustes dentro del caparazón', async () => {
    const { element } = await navigate('/ajustes');

    expect(element.querySelector('app-shell main app-ajustes-page h1')?.textContent?.trim()).toBe(
      'Ajustes',
    );
  });
});

describe('rutas protegidas por la sesión', () => {
  it.each(['/biblioteca', '/repaso', '/practicar'])(
    'sin sesión, %s lleva a /login',
    async (url) => {
      expect((await navigate(url, SIGNED_OUT)).finalUrl).toBe('/login');
    },
  );

  it('sin acceso, /hoy lleva a /sin-acceso', async () => {
    expect((await navigate('/hoy', NO_ACCESS)).finalUrl).toBe('/sin-acceso');
  });

  it('con sesión, /login lleva a /hoy', async () => {
    expect((await navigate('/login', ACTIVE)).finalUrl).toBe('/hoy');
  });

  it('sin sesión, una URL inexistente termina en /login', async () => {
    expect((await navigate('/no-existe', SIGNED_OUT)).finalUrl).toBe('/login');
  });
});
