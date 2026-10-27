import { FakeAppUpdate } from './fake-app-update';

describe('FakeAppUpdate', () => {
  it('la prueba decide cuándo hay versión y cuenta las recargas', () => {
    const fake = new FakeAppUpdate();
    expect(fake.updateReady()).toBe(false);

    fake.setReady(true);
    fake.reload();

    expect(fake.updateReady()).toBe(true);
    expect(fake.reloads).toBe(1);
  });
});
