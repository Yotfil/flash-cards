import { TestBed } from '@angular/core/testing';

import { APP_VERSION, BUILD_DETAILS, type BuildDetails } from '@core/app-version';
import { BUILD_INFO } from '@core/build-info';
import { formatBuildDate } from '@services/version/version-format';

import { VersionFooterComponent } from './version-footer.component';

function renderLines(details?: BuildDetails): string[] {
  if (details) {
    TestBed.configureTestingModule({ providers: [{ provide: BUILD_DETAILS, useValue: details }] });
  }
  const fixture = TestBed.createComponent(VersionFooterComponent);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return Array.from(element.querySelectorAll('p')).map((line) => line.textContent?.trim() ?? '');
}

describe('VersionFooterComponent', () => {
  it('pinta la versión de package.json, el commit y la fecha del build', () => {
    expect(renderLines()).toEqual([
      `v${APP_VERSION} · ${BUILD_INFO.commit}`,
      formatBuildDate(BUILD_INFO.builtAt),
    ]);
  });

  it('une versión y commit en la primera línea y la fecha local en la segunda', () => {
    const lines = renderLines({
      version: '0.4.0',
      commit: '99ed108',
      builtAt: '2026-07-02T16:47:00Z',
    });

    expect(lines[0]).toBe('v0.4.0 · 99ed108');
    expect(lines[1]).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it('con un build sin historial de git muestra sin-git', () => {
    const lines = renderLines({ version: '0.4.0', commit: 'sin-git', builtAt: BUILD_INFO.builtAt });

    expect(lines[0]).toBe('v0.4.0 · sin-git');
  });
});
