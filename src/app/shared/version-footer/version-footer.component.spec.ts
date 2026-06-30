import { TestBed } from '@angular/core/testing';

import { VersionFooterComponent } from './version-footer.component';

describe('VersionFooterComponent', () => {
  it('se crea y muestra la versión', () => {
    TestBed.configureTestingModule({ imports: [VersionFooterComponent] });

    const fixture = TestBed.createComponent(VersionFooterComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    // Muestra "v" + un semver (la versión real de package.json).
    expect(fixture.nativeElement.textContent).toMatch(/v\d+\.\d+\.\d+/);
  });
});
