import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { AuthService } from '@services/auth.service';
import { SinAccesoComponent } from './sin-acceso.component';

describe('SinAccesoComponent', () => {
  it('se crea', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            accessDeniedEmail: signal('pendiente@ejemplo.com'),
            accessDenied: signal(true),
            isAuthenticated: signal(false),
            sessionResolved: signal(false),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(SinAccesoComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
