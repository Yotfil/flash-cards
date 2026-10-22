import { defineConfig } from 'vitest/config';

// Pruebas de INTEGRACIÓN: corren contra el emulador de Firestore (ver `test:integration` en
// package.json) y viven aparte de las unitarias para que el ciclo rojo-verde siga siendo rápido.
// Alcance: las reglas de seguridad (`tests/rules/`) y, más adelante, los repositorios
// (`src/**/*.integration.spec.ts`).
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/rules/**/*.spec.ts', 'src/**/*.integration.spec.ts'],
    // Arrancar la conexión con el emulador tarda; margen holgado para la primera prueba.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@core': '/src/app/core',
      '@domain': '/src/app/domain',
      '@services': '/src/app/services',
      '@infrastructure': '/src/app/infrastructure',
      '@features': '/src/app/features',
      '@shared': '/src/app/shared',
      '@testing': '/src/app/testing',
    },
  },
});
