import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import type { User } from '@domain/models';
import { AuthService } from '@services/auth.service';
import { AjustesComponent } from './ajustes.component';

function fakeUser(defaultNewCardsPerDay: number): User {
  return {
    id: 'u1',
    displayName: 'Ada',
    email: 'ada@example.com',
    createdAt: new Date(),
    settings: { timezone: 'UTC', dayStartHour: 4, theme: 'system', defaultNewCardsPerDay },
    isSearchable: false,
  };
}

describe('AjustesComponent', () => {
  it('se crea sin sesión', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { currentUser: signal(null), signOut: async () => undefined },
        },
      ],
    });

    const fixture = TestBed.createComponent(AjustesComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('precarga el default del usuario y lo guarda al editar', async () => {
    const updateSettings = vi.fn(async () => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(fakeUser(15)),
            signOut: async () => undefined,
            updateSettings,
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(AjustesComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      newCardsControl: { value: number; setValue: (n: number) => void };
      saveDefaultNewCards: () => Promise<void>;
    };

    expect(component.newCardsControl.value).toBe(15);

    component.newCardsControl.setValue(5);
    await component.saveDefaultNewCards();

    expect(updateSettings).toHaveBeenCalledWith({ defaultNewCardsPerDay: 5 });
  });
});
