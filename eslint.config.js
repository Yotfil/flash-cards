// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
// Desactiva las reglas de ESLint que chocarían con el formato de Prettier.
// Debe ir al final para tener la última palabra sobre el estilo.
const prettier = require('eslint-config-prettier');

// Alias y rutas relativas de una capa, para prohibir su importación desde otra.
function layer(name) {
  return [`@${name}/*`, `**/${name}/**`];
}

// El patrón relativo `**/core/**` también atrapa paquetes de Angular con una carpeta del mismo
// nombre (`@angular/core/testing`, `@angular/core/rxjs-interop`). Esta excepción va DESPUÉS de los
// patrones de capa de cada grupo (en gitignore manda el último patrón que coincide); en domain/
// la sigue la prohibición explícita de Angular, que vuelve a mandar.
const NOT_ANGULAR_PACKAGES = '!@angular/**';

// Librerías de datos y algoritmo: solo entran como adaptadores en infrastructure/.
const DATA_LIBRARIES = ['firebase', 'firebase/*', '@firebase/*', 'ts-fsrs'];

const TESTING_ONLY_IN_SPECS = [...layer('testing')];
const TESTING_MESSAGE = 'Los fakes de testing/ solo se importan desde archivos *.spec.ts.';

// Genera, por capa, dos bloques: el de producción (sus prohibiciones + los fakes de testing/)
// y el de pruebas (solo sus prohibiciones, porque los *.spec.ts sí usan los fakes).
function layerBoundaries(layers) {
  return layers.flatMap(({ layer: name, forbidden, message }) => {
    const rule = (patterns) => ({
      '@typescript-eslint/no-restricted-imports': ['error', { patterns }],
    });
    const own = forbidden.length > 0 ? [{ group: forbidden, message }] : [];
    return [
      {
        files: [`src/app/${name}/**/*.ts`],
        ignores: ['**/*.spec.ts'],
        rules: rule([...own, { group: TESTING_ONLY_IN_SPECS, message: TESTING_MESSAGE }]),
      },
      ...(own.length > 0 ? [{ files: [`src/app/${name}/**/*.spec.ts`], rules: rule(own) }] : []),
    ];
  });
}

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      // Contrato de ingeniería (CLAUDE.md): tipado fuerte, cero `any`.
      // Una excepción puntual se permite solo con un eslint-disable justificado por escrito.
      '@typescript-eslint/no-explicit-any': 'error',
      // Contrato de ingeniería: prohibido el `catch` vacío; cada fallo se maneja visible.
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
  // ───────────────────────────────────────────────────────────────────────
  // Fronteras de capas (ADR 0001, exigidas por herramienta desde el ADR 0002).
  // Cada capa solo puede importar lo que su fila permite; Firebase y ts-fsrs entran
  // únicamente como adaptadores en `infrastructure/`. Los patrones relativos atrapan
  // los cruces que esquivan los alias. Los fakes de `testing/` solo se importan desde
  // archivos *.spec.ts. En flat config la regla de un bloque posterior REEMPLAZA a la del
  // anterior (no se suman), por eso cada capa recibe su lista completa en un solo bloque.
  // ───────────────────────────────────────────────────────────────────────
  ...layerBoundaries([
    {
      layer: 'domain',
      forbidden: [
        ...layer('services'),
        ...layer('infrastructure'),
        ...layer('features'),
        ...layer('shared'),
        ...layer('core'),
        NOT_ANGULAR_PACKAGES,
        '@angular/*',
        ...DATA_LIBRARIES,
        'zod',
      ],
      message:
        'domain/ es TypeScript puro: modelos y puertos sin dependencias de ninguna otra capa ni librería.',
    },
    {
      layer: 'services',
      forbidden: [
        ...layer('infrastructure'),
        ...layer('features'),
        ...layer('shared'),
        ...layer('core'),
        NOT_ANGULAR_PACKAGES,
        ...DATA_LIBRARIES,
      ],
      message:
        'services/ es lógica pura sobre domain/: habla con el almacén y el algoritmo solo a través de puertos.',
    },
    {
      layer: 'infrastructure',
      forbidden: [
        ...layer('services'),
        ...layer('features'),
        ...layer('shared'),
        ...layer('core'),
        NOT_ANGULAR_PACKAGES,
      ],
      message:
        'infrastructure/ implementa puertos de domain/; no conoce servicios, UI ni la raíz de composición.',
    },
    {
      layer: 'features',
      forbidden: [...layer('infrastructure'), NOT_ANGULAR_PACKAGES, ...DATA_LIBRARIES],
      message:
        'features/ solo pinta y captura eventos: usa services/ y shared/, nunca infrastructure/ ni librerías de datos.',
    },
    {
      layer: 'shared',
      forbidden: [
        ...layer('infrastructure'),
        ...layer('services'),
        ...layer('features'),
        ...layer('core'),
        NOT_ANGULAR_PACKAGES,
        ...DATA_LIBRARIES,
      ],
      message: 'shared/ es UI presentacional reutilizable: solo tipos de domain/.',
    },
    {
      layer: 'core',
      forbidden: [],
      message: 'core/ es la raíz de composición: puede enchufar cualquier capa.',
    },
  ]),
  {
    // Archivos de la raíz de src/app (componente raíz, app.config): nunca los fakes.
    files: ['src/app/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [{ group: TESTING_ONLY_IN_SPECS, message: TESTING_MESSAGE }] },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  // Prettier al final: anula reglas de formato conflictivas en todos los archivos.
  prettier,
]);
