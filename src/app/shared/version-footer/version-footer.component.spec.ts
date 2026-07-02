import { TestBed } from '@angular/core/testing';

import { BUILD_INFO } from '@core/build-info';

import { VersionFooterComponent } from './version-footer.component';

describe('VersionFooterComponent', () => {
  it('se crea y muestra versión, commit y fecha-hora del build', () => {
    TestBed.configureTestingModule({ imports: [VersionFooterComponent] });

    const fixture = TestBed.createComponent(VersionFooterComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();

    const texto: string = fixture.nativeElement.textContent;
    // Muestra "v" + un semver (la versión real de package.json).
    expect(texto).toMatch(/v\d+\.\d+\.\d+/);
    // Muestra el commit de git del build (el generado en build-info.ts).
    expect(texto).toContain(BUILD_INFO.commit);
    // Muestra la fecha-hora del build en formato dd/MM/yyyy HH:mm.
    expect(texto).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
  });
});
