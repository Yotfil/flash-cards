import { Timestamp } from 'firebase/firestore';

import { userDocumentSchema } from './user.schema';

const PROFILE = {
  displayName: 'Ada',
  email: 'ada@ejemplo.com',
  createdAt: Timestamp.fromDate(new Date('2026-06-15T10:00:00.000Z')),
  isSearchable: false,
  settings: { timezone: 'America/Bogota', dayStartHour: 4, theme: 'system' },
};

describe('userDocumentSchema', () => {
  it('un perfil anterior a la práctica con IA lee 20 ítems por paquete y sin plantilla propia', () => {
    const { settings } = userDocumentSchema.parse(PROFILE);

    expect(settings.practicePackageCapacity).toBe(20);
    expect(settings.promptTemplate).toBeUndefined();
  });

  it('con sus ajustes de práctica guardados, se leen tal cual', () => {
    const { settings } = userDocumentSchema.parse({
      ...PROFILE,
      settings: {
        ...PROFILE.settings,
        practicePackageCapacity: 12,
        promptTemplate: 'Mi [[REPASADAS]]',
      },
    });

    expect(settings.practicePackageCapacity).toBe(12);
    expect(settings.promptTemplate).toBe('Mi [[REPASADAS]]');
  });
});
