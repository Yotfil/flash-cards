// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
// Desactiva las reglas de ESLint que chocarían con el formato de Prettier.
// Debe ir al final para tener la última palabra sobre el estilo.
const prettier = require('eslint-config-prettier');

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
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  // Prettier al final: anula reglas de formato conflictivas en todos los archivos.
  prettier,
]);
