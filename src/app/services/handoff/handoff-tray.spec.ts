import { HandoffTray } from './handoff-tray';

class NoteTray extends HandoffTray<{ readonly note: string }> {}

describe('HandoffTray', () => {
  it('guarda lo entregado y la bandeja lo deja ver sin consumirlo', () => {
    const tray = new NoteTray();

    tray.hand({ note: 'hola' });

    expect(tray.prepared()).toEqual({ note: 'hola' });
    expect(tray.prepared()).toEqual({ note: 'hola' });
  });

  it('take lo devuelve una sola vez y vacía la bandeja', () => {
    const tray = new NoteTray();
    tray.hand({ note: 'hola' });

    expect(tray.take()).toEqual({ note: 'hola' });
    expect(tray.take()).toBeNull();
    expect(tray.prepared()).toBeNull();
  });

  it('sin nada entregado, take devuelve null', () => {
    expect(new NoteTray().take()).toBeNull();
  });
});
