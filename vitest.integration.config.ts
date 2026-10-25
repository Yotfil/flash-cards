import { defineConfig } from 'vitest/config';

// Pruebas de INTEGRACIÓN: corren contra el emulador de Firestore (ver `test:integration` en
// package.json) y viven aparte de las unitarias para que el ciclo rojo-verde siga siendo rápido.
// Alcance: todo `tests/` (reglas de seguridad, escritor por lotes y pruebas estáticas de
// configuración, que solo necesitan Node) y los repositorios (`src/**/*.integration.spec.ts`).
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.spec.ts', 'src/**/*.integration.spec.ts'],
    // Todos los archivos comparten el mismo emulador y cada uno lo vacía en su `beforeEach`: en
    // paralelo, uno borraría los datos sembrados por otro a mitad de prueba.
    fileParallelism: false,
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
