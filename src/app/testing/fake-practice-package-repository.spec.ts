import { PackageCompletedError } from '@domain/ports/practice-package.repository';

import { FakePracticePackageRepository, aPackage } from './fake-practice-package-repository';

describe('FakePracticePackageRepository', () => {
  it('como el real, no agrega a un paquete completado', async () => {
    const repository = new FakePracticePackageRepository();
    repository.seed(aPackage({ id: 'p1', status: 'completed' }, []));

    await expect(
      repository.addItems('u1', 'p1', [{ cardType: 'basic', front: 'a', back: 'b' }]),
    ).rejects.toBeInstanceOf(PackageCompletedError);
  });
});
