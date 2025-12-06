/* eslint-disable @typescript-eslint/naming-convention */
import prettier from 'eslint-plugin-prettier/recommended';
import sortExports from 'eslint-plugin-sort-exports';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';
import pluginJest from 'eslint-plugin-jest';

export default tseslint.config(
  {
    ignores: ['**/*.config.js'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  sonarjs.configs.recommended,
  prettier,
  {
    plugins: {
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

      '@typescript-eslint/prefer-readonly': 'error',

      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            'constructor',
            'public-static-method',
            'protected-static-method',
            'private-static-method',
            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',
          ],
        },
      ],

      curly: 'error',
      'max-params': ['error', 7],
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
          next: ['block-like', 'return', 'break', 'continue', 'throw'],
        },
      ],

      'sonarjs/todo-tag': 'warn',
      'sonarjs/pseudo-random': 'off',
      'no-await-in-loop': 'error',
      'no-param-reassign': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },

  {
    // update this to match your test files
    files: ['**/*.spec.ts', '**/*.test.ts'],
    plugins: { jest: pluginJest },
    languageOptions: {
      globals: pluginJest.environments.globals.globals,
    },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'off',
    },
  },
);
