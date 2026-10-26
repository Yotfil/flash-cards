import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import type { UserSettings } from '@domain/models/user.model';
import { ConnectivityPort } from '@domain/ports/connectivity.port';
import { Logger } from '@domain/ports/logger.port';
import { ThemePort } from '@domain/ports/theme.port';
import { SessionService } from '@services/session/session.service';
import { deviceTimeZone } from '@services/settings/time-zones';
import { ThemeService } from '@services/theme/theme.service';
import { FakeConnectivity } from '@testing/fake-connectivity';
import { FakeLogger } from '@testing/fake-logger';
import { FakeSessionService } from '@testing/fake-session';
import { FakeThemePort } from '@testing/fake-theme-port';
import { aUser } from '@testing/fake-user-repository';

import { AjustesPageComponent } from './ajustes-page.component';

@Component({ template: '' })
class BlankPageComponent {}

const settle = () => new Promise((resolve) => setTimeout(resolve));

const OTHER_ZONE = deviceTimeZone() === 'America/Bogota' ? 'Europe/Madrid' : 'America/Bogota';

async function render(options: { settings?: Partial<UserSettings>; online?: boolean } = {}) {
  const user = aUser({ displayName: 'Ada', email: 'ada@ejemplo.com' });
  const session = new FakeSessionService({
    kind: 'active',
    user: {
      ...user,
      settings: {
        timezone: OTHER_ZONE,
        dayStartHour: 4,
        theme: 'system',
        defaultNewCardsPerDay: 15,
        autoGradeByTime: true,
        ...options.settings,
      },
    },
  });
  const connectivity = new FakeConnectivity(options.online ?? true);
  const logger = new FakeLogger();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'ajustes', component: AjustesPageComponent },
        { path: 'login', component: BlankPageComponent },
      ]),
      { provide: SessionService, useValue: session },
      { provide: ConnectivityPort, useValue: connectivity },
      { provide: Logger, useValue: logger },
      { provide: ThemePort, useValue: new FakeThemePort() },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/ajustes');
  const element = harness.routeNativeElement as HTMLElement;
  const update = async () => {
    await settle();
    harness.detectChanges();
    await harness.fixture.whenStable();
  };
  await update();

  const query = <T extends Element>(selector: string) => element.querySelector<T>(selector);
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
  const typeNewCards = (value: string) => {
    const input = query<HTMLInputElement>('#default-new-cards');
    if (!input) throw new Error('Falta el campo de nuevas');
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const select = (selector: string, value: string) => {
    const control = query<HTMLSelectElement>(selector);
    if (!control) throw new Error(`Falta ${selector}`);
    control.value = value;
    control.dispatchEvent(new Event('change'));
  };
  return {
    harness,
    element,
    session,
    connectivity,
    logger,
    update,
    query,
    button,
    typeNewCards,
    select,
    router: TestBed.inject(Router),
    theme: TestBed.inject(ThemeService),
  };
}

describe('AjustesPageComponent · estructura', () => {
  it('ordena las secciones Sesión, Estudio, Día de estudio y Apariencia', async () => {
    const { element } = await render();

    const headings = Array.from(element.querySelectorAll('section h2')).map((heading) =>
      heading.textContent?.trim(),
    );
    expect(headings).toEqual(['Sesión', 'Estudio', 'Día de estudio', 'Apariencia']);
  });

  it('muestra con quién está iniciada la sesión', async () => {
    const { element } = await render();

    const sessionSection = element.querySelector('section');
    expect(sessionSection?.textContent).toContain('Sesión iniciada como');
    expect(sessionSection?.textContent).toContain('Ada');
    expect(sessionSection?.textContent).toContain('ada@ejemplo.com');
  });

  it('termina con Cerrar sesión y el pie de versión', async () => {
    const { element } = await render();

    const last = Array.from(element.querySelectorAll('section, button, app-version-footer')).slice(
      -2,
    );
    expect(last[0]?.textContent?.trim()).toBe('Cerrar sesión');
    expect(last[1]?.tagName.toLowerCase()).toBe('app-version-footer');
  });
});

describe('AjustesPageComponent · tarjetas nuevas por día', () => {
  it('precarga el valor y "Guardar" solo se habilita si cambia', async () => {
    const { query, button, typeNewCards, update } = await render();

    expect(query<HTMLInputElement>('#default-new-cards')?.value).toBe('15');
    expect(button('Guardar')?.disabled).toBe(true);

    typeNewCards('5');
    await update();
    expect(button('Guardar')?.disabled).toBe(false);
  });

  it.each(['1000', '2.5'])('con %s avisa el rango y no guarda', async (value) => {
    const { button, typeNewCards, update, element, session } = await render();

    typeNewCards(value);
    await update();
    button('Guardar')?.click();
    await update();

    expect(element.textContent).toContain('Escribe un número entre 0 y 999.');
    expect(session.settingsUpdates).toEqual([]);
  });

  it('cero es un valor válido', async () => {
    const { button, typeNewCards, update, session } = await render();

    typeNewCards('0');
    await update();
    button('Guardar')?.click();
    await update();

    expect(session.settingsUpdates).toEqual([{ defaultNewCardsPerDay: 0 }]);
  });

  it('mientras guarda muestra "Guardando…", ignora otra pulsación y al terminar dice "Guardado."', async () => {
    const { button, query, typeNewCards, update, session, element } = await render();
    const release = session.holdUpdates();
    typeNewCards('5');
    await update();

    button('Guardar')?.click();
    await update();
    const saveButton = query<HTMLButtonElement>('#save-new-cards');
    expect(saveButton?.textContent?.trim()).toBe('Guardando…');
    saveButton?.click();
    await update();
    expect(session.settingsUpdates).toHaveLength(1);

    release();
    await update();
    expect(element.textContent).toContain('Guardado.');
    expect(saveButton?.disabled).toBe(true);
    expect(session.user()?.settings.defaultNewCardsPerDay).toBe(5);

    typeNewCards('6');
    await update();
    expect(element.textContent).not.toContain('Guardado.');
  });

  it('si falla explica el error, registra el detalle y la sesión conserva el valor', async () => {
    const { button, query, typeNewCards, update, session, logger } = await render();
    session.failOnUpdate = new Error('offline');
    typeNewCards('5');
    await update();

    button('Guardar')?.click();
    await update();

    expect(query('#new-cards-result[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo guardar. Inténtalo de nuevo.',
    );
    expect(logger.entries.filter((entry) => entry.level === 'error')).toHaveLength(1);
    expect(session.user()?.settings.defaultNewCardsPerDay).toBe(15);
  });
});

describe('AjustesPageComponent · sugerencia por tiempo', () => {
  function toggle(checkbox: HTMLInputElement | null) {
    if (!checkbox) throw new Error('Falta la casilla');
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change'));
  }

  it('la casilla refleja el ajuste y desmarcarla lo guarda', async () => {
    const { query, update, session } = await render();
    const checkbox = query<HTMLInputElement>('#auto-grade');
    expect(checkbox?.checked).toBe(true);

    toggle(checkbox);
    await update();

    expect(session.settingsUpdates).toEqual([{ autoGradeByTime: false }]);
    expect(checkbox?.checked).toBe(false);
  });

  it('queda deshabilitada mientras guarda', async () => {
    const { query, update, session } = await render();
    const release = session.holdUpdates();
    const checkbox = query<HTMLInputElement>('#auto-grade');

    toggle(checkbox);
    await update();
    expect(checkbox?.disabled).toBe(true);

    release();
    await update();
    expect(checkbox?.disabled).toBe(false);
  });

  it('si falla vuelve a su valor y muestra el error junto a ella', async () => {
    const { query, update, session } = await render();
    session.failOnUpdate = new Error('offline');
    const checkbox = query<HTMLInputElement>('#auto-grade');

    toggle(checkbox);
    await update();

    expect(checkbox?.checked).toBe(true);
    expect(query('#auto-grade-error[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo guardar. Inténtalo de nuevo.',
    );
  });
});

describe('AjustesPageComponent · día de estudio', () => {
  it('el selector de zona muestra la del perfil y elegir otra la guarda', async () => {
    const { query, select, update, session } = await render({
      settings: { timezone: 'America/Bogota' },
    });
    expect(query<HTMLSelectElement>('#time-zone')?.value).toBe('America/Bogota');

    select('#time-zone', 'Europe/Madrid');
    await update();

    expect(session.settingsUpdates).toEqual([{ timezone: 'Europe/Madrid' }]);
    expect(query<HTMLSelectElement>('#time-zone')?.value).toBe('Europe/Madrid');
  });

  it('si el dispositivo está en otra zona lo avisa y "Usar esta zona" la guarda', async () => {
    const { element, button, update, session } = await render({
      settings: { timezone: OTHER_ZONE },
    });

    expect(element.textContent).toContain(`Tu dispositivo está en ${deviceTimeZone()}.`);
    expect(session.settingsUpdates).toEqual([]);

    button('Usar esta zona')?.click();
    await update();

    expect(session.settingsUpdates).toEqual([{ timezone: deviceTimeZone() }]);
    expect(element.textContent).not.toContain('Tu dispositivo está en');
  });

  it('con la misma zona que el dispositivo no hay aviso', async () => {
    const { element, button } = await render({ settings: { timezone: deviceTimeZone() } });

    expect(element.textContent).not.toContain('Tu dispositivo está en');
    expect(button('Usar esta zona')).toBeUndefined();
  });

  it('la hora de inicio ofrece las 24 horas y elegir 02:00 la guarda', async () => {
    const { query, select, update, session } = await render();
    const options = Array.from(query<HTMLSelectElement>('#day-start-hour')?.options ?? []);

    expect(options.map((option) => option.textContent?.trim())).toEqual(
      Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`),
    );
    expect(query<HTMLSelectElement>('#day-start-hour')?.value).toBe('4');

    select('#day-start-hour', '2');
    await update();

    expect(session.settingsUpdates).toEqual([{ dayStartHour: 2 }]);
  });
});

describe('AjustesPageComponent · apariencia', () => {
  function radios(element: HTMLElement) {
    return Array.from(
      element.querySelectorAll<HTMLButtonElement>('[role="radiogroup"] [role="radio"]'),
    );
  }

  it('ofrece Oscuro, Claro y Sistema y marca el actual', async () => {
    const { element } = await render({ settings: { theme: 'system' } });

    expect(radios(element).map((radio) => radio.textContent?.trim())).toEqual([
      'Oscuro',
      'Claro',
      'Sistema',
    ]);
    expect(radios(element).map((radio) => radio.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'true',
    ]);
  });

  it('tocar "Claro" cambia el tema al instante y lo guarda', async () => {
    const { element, button, update, session, theme } = await render();
    const release = session.holdUpdates();

    button('Claro')?.click();
    await update();
    expect(theme.preference()).toBe('light');
    expect(radios(element)[1]?.getAttribute('aria-checked')).toBe('true');

    release();
    await update();
    expect(session.settingsUpdates).toEqual([{ theme: 'light' }]);
    expect(theme.preference()).toBe('light');
  });

  it('si el guardado falla vuelve a seguir al sistema y avisa junto al grupo', async () => {
    const { element, button, update, session, theme, query } = await render();
    session.failOnUpdate = new Error('offline');

    button('Oscuro')?.click();
    await update();

    expect(theme.preference()).toBe('system');
    expect(radios(element)[2]?.getAttribute('aria-checked')).toBe('true');
    expect(query('#theme-error[role="alert"]')?.textContent?.trim()).toBe(
      'No se pudo guardar. Inténtalo de nuevo.',
    );
  });
});

describe('AjustesPageComponent · cerrar sesión', () => {
  it('muestra "Cerrando sesión…", cierra una sola vez y lleva a /login', async () => {
    const { element, update, session, router } = await render();
    const release = session.holdSignOut();
    const signOutButton = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === 'Cerrar sesión',
    );

    signOutButton?.click();
    await update();
    expect(signOutButton?.textContent?.trim()).toBe('Cerrando sesión…');
    signOutButton?.click();

    release();
    await update();
    expect(session.signOuts).toBe(1);
    expect(router.url).toBe('/login');
  });
});

describe('AjustesPageComponent · sin conexión', () => {
  function choiceControls(element: HTMLElement) {
    return [
      element.querySelector<HTMLInputElement>('#auto-grade'),
      element.querySelector<HTMLSelectElement>('#time-zone'),
      element.querySelector<HTMLSelectElement>('#day-start-hour'),
      ...Array.from(element.querySelectorAll<HTMLButtonElement>('[role="radio"]')),
      Array.from(element.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === 'Usar esta zona',
      ) ?? null,
    ];
  }

  it('deshabilita lo que guarda, lo explica una sola vez y deja ver los valores', async () => {
    const { element, query, button } = await render({ online: false });

    choiceControls(element).forEach((control) => expect(control?.disabled).toBe(true));
    expect(button('Guardar')?.disabled).toBe(true);
    const notes = element.querySelectorAll('[role="status"]');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.textContent?.trim()).toBe('Necesitas conexión para guardar cambios.');
    expect(query<HTMLInputElement>('#default-new-cards')?.value).toBe('15');
    expect(query<HTMLInputElement>('#auto-grade')?.checked).toBe(true);
  });

  it('escribir sin red no habilita "Guardar"; al volver la red se habilita con lo escrito', async () => {
    const { element, query, button, typeNewCards, update, connectivity } = await render({
      online: false,
    });

    typeNewCards('5');
    await update();
    expect(button('Guardar')?.disabled).toBe(true);

    connectivity.setOnline(true);
    await update();
    expect(button('Guardar')?.disabled).toBe(false);
    expect(query<HTMLInputElement>('#default-new-cards')?.value).toBe('5');
    choiceControls(element).forEach((control) => expect(control?.disabled).toBe(false));
    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('cerrar sesión sigue disponible sin red', async () => {
    const { button } = await render({ online: false });

    expect(button('Cerrar sesión')?.disabled).toBe(false);
  });
});
