import { TestBed } from '@angular/core/testing';

import { ThemePort } from '@domain/ports/theme.port';
import { SessionService } from '@services/session/session.service';
import { ThemeService } from '@services/theme/theme.service';
import { FakeSessionService } from '@testing/fake-session';
import { FakeThemePort } from '@testing/fake-theme-port';
import { aUser } from '@testing/fake-user-repository';

import { ProfileThemeSync } from './profile-theme-sync';

function setup() {
  const session = new FakeSessionService();
  TestBed.configureTestingModule({
    providers: [
      { provide: SessionService, useValue: session },
      { provide: ThemePort, useValue: new FakeThemePort('dark') },
    ],
  });
  TestBed.inject(ProfileThemeSync);
  const theme = TestBed.inject(ThemeService);
  TestBed.tick();
  return { session, theme };
}

describe('ProfileThemeSync', () => {
  it('al activarse la sesión, el tema del perfil manda sobre el recordado', () => {
    const { session, theme } = setup();
    expect(theme.preference()).toBe('dark');

    const user = aUser();
    session.setState({
      kind: 'active',
      user: { ...user, settings: { ...user.settings, theme: 'light' } },
    });
    TestBed.tick();

    expect(theme.preference()).toBe('light');
  });

  it('sin sesión no toca el tema', () => {
    const { session, theme } = setup();

    session.setState({ kind: 'signedOut' });
    TestBed.tick();

    expect(theme.preference()).toBe('dark');
  });
});
