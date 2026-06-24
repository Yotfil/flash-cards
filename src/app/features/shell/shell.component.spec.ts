import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  it('se crea', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
