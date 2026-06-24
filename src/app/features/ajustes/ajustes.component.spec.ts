import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { AuthService } from '@services/auth.service';
import { AjustesComponent } from './ajustes.component';

describe('AjustesComponent', () => {
  it('se crea', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(null),
            signOut: async () => {
              // sin efecto en la prueba
            },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(AjustesComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
