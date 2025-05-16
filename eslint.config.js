/* eslint-disable @typescript-eslint/naming-convention */
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier/recommended';
import sortExports from 'eslint-plugin-sort-exports';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import sonarjs from 'eslint-plugin-sonarjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ),
  prettier,
  sonarjs.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'sort-exports': sortExports,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },

      parser: tsParser,
    },

    rules: {
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'memberLike',
          format: ['camelCase'],
          leadingUnderscore: 'forbid',
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
      ],

      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'explicit',

          overrides: {
            constructors: 'no-public',
            accessors: 'no-public',
          },
        },
      ],

      curly: 'error',
      'require-await': 'error',

      'no-else-return': [
        'error',
        {
          allowElseIf: false,
        },
      ],

      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'block-like' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        {
          blankLine: 'always',
          prev: '*',
          next: [
            'block-like',
            'return',
            'break',
            'continue',
            'throw',
          ],
        },
      ],

      'sonarjs/todo-tag': 'warn',
      'no-await-in-loop': 'error'
    },
  },
];
