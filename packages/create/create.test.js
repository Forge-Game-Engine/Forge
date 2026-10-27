// @vitest-environment node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createProject,
  defaultTargetDirectory,
  detectPackageManager,
  enginePackageName,
  getNextSteps,
  isEmptyDirectory,
  parseArguments,
  toValidPackageName,
} from './create.js';

/**
 * Reads a JSON file.
 * @param {string} filePath - The file to read.
 * @returns {unknown} The parsed JSON.
 */
const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));

describe('parseArguments', () => {
  it('returns no directory when none is given', () => {
    expect(parseArguments([])).toEqual({
      help: false,
      targetDirectory: undefined,
    });
  });

  it('returns the directory', () => {
    expect(parseArguments(['my-game'])).toEqual({
      help: false,
      targetDirectory: 'my-game',
    });
  });

  it('accepts . for the current directory', () => {
    expect(parseArguments(['.']).targetDirectory).toBe('.');
  });

  it.each(['--help', '-h'])('returns help for %s', (flag) => {
    expect(parseArguments(['my-game', flag]).help).toBe(true);
  });

  it('throws for an unknown option', () => {
    expect(() => parseArguments(['--template', 'vanilla'])).toThrow(
      'Unknown option "--template".',
    );
  });

  it('throws for more than one directory', () => {
    expect(() => parseArguments(['one', 'two'])).toThrow(
      'Expected at most one directory, got 2: one, two.',
    );
  });
});

describe('toValidPackageName', () => {
  it.each([
    ['my-game', 'my-game'],
    ['My Game', 'my-game'],
    ['  spaced   out  ', 'spaced-out'],
    ['.hidden', 'hidden'],
    ['_private', 'private'],
    ['game@2!', 'game-2'],
    ['v1.0_final~draft', 'v1.0_final~draft'],
    ['-.-dashes-', 'dashes'],
  ])('turns "%s" into "%s"', (name, expected) => {
    expect(toValidPackageName(name)).toBe(expected);
  });

  it('falls back to the default directory name when nothing valid is left', () => {
    expect(toValidPackageName('!!!')).toBe(defaultTargetDirectory);
    expect(toValidPackageName('')).toBe(defaultTargetDirectory);
  });
});

describe('detectPackageManager', () => {
  it.each([
    ['npm/10.9.0 node/v22.11.0 linux x64 workspaces/false', 'npm'],
    ['pnpm/9.12.0 npm/? node/v22.11.0 linux x64', 'pnpm'],
    ['yarn/4.5.1 npm/? node/v22.11.0 linux x64', 'yarn'],
    ['bun/1.1.34 npm/? node/v22.11.0 linux x64', 'bun'],
  ])('detects "%s" as %s', (userAgent, expected) => {
    expect(detectPackageManager(userAgent)).toBe(expected);
  });

  it('falls back to npm without a user agent', () => {
    expect(detectPackageManager(undefined)).toBe('npm');
  });

  it('falls back to npm for an unknown package manager', () => {
    expect(detectPackageManager('deno/2.0.0 npm/? deno/2.0.0')).toBe('npm');
  });
});

describe('getNextSteps', () => {
  const currentDirectory = path.resolve('/projects');

  it('changes into the directory, then installs and runs', () => {
    expect(
      getNextSteps(
        path.join(currentDirectory, 'my-game'),
        currentDirectory,
        'pnpm',
      ),
    ).toEqual(['cd my-game', 'pnpm install', 'pnpm run dev']);
  });

  it('leaves out cd for the current directory', () => {
    expect(getNextSteps('.', currentDirectory, 'npm')).toEqual([
      'npm install',
      'npm run dev',
    ]);
  });

  it('quotes a directory with whitespace', () => {
    expect(getNextSteps('my game', currentDirectory, 'yarn')[0]).toBe(
      'cd "my game"',
    );
  });
});

describe('with a temporary directory', () => {
  /** @type {string} */
  let temporaryDirectory;
  /** @type {string} */
  let templateDirectory;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'forge-create-'));
    templateDirectory = path.join(temporaryDirectory, 'template');

    mkdirSync(path.join(templateDirectory, 'src', 'nested'), {
      recursive: true,
    });
    writeFileSync(path.join(templateDirectory, '_gitignore'), 'node_modules\n');
    writeFileSync(
      path.join(templateDirectory, 'src', 'nested', '_gitignore'),
      'out\n',
    );
    writeFileSync(path.join(templateDirectory, 'src', 'main.ts'), 'main\n');
    writeFileSync(
      path.join(templateDirectory, 'package.json'),
      JSON.stringify({
        name: 'placeholder',
        private: true,
        scripts: { dev: 'vite' },
        dependencies: { [enginePackageName]: '0.0.0', other: '^1.0.0' },
        devDependencies: { vite: '^8.0.0' },
      }),
    );
  });

  afterEach(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  describe('isEmptyDirectory', () => {
    it('is true for an empty directory', () => {
      const directory = path.join(temporaryDirectory, 'empty');

      mkdirSync(directory);

      expect(isEmptyDirectory(directory)).toBe(true);
    });

    it('is true for a directory holding only .git', () => {
      const directory = path.join(temporaryDirectory, 'repository');

      mkdirSync(path.join(directory, '.git'), { recursive: true });

      expect(isEmptyDirectory(directory)).toBe(true);
    });

    it('is false for a directory with a file', () => {
      expect(isEmptyDirectory(templateDirectory)).toBe(false);
    });
  });

  describe('createProject', () => {
    it('copies the template, renaming _gitignore to .gitignore', () => {
      const targetDirectory = path.join(temporaryDirectory, 'my-game');

      createProject({
        templateDirectory,
        targetDirectory,
        packageName: 'my-game',
        engineVersion: '1.2.3',
      });

      expect(
        readFileSync(path.join(targetDirectory, '.gitignore'), 'utf8'),
      ).toBe('node_modules\n');
      expect(
        readFileSync(
          path.join(targetDirectory, 'src', 'nested', '.gitignore'),
          'utf8',
        ),
      ).toBe('out\n');
      expect(
        readFileSync(path.join(targetDirectory, 'src', 'main.ts'), 'utf8'),
      ).toBe('main\n');
      expect(existsSync(path.join(targetDirectory, '_gitignore'))).toBe(false);
    });

    it('names the package and pins the engine version, keeping the other fields', () => {
      const targetDirectory = path.join(temporaryDirectory, 'my-game');

      createProject({
        templateDirectory,
        targetDirectory,
        packageName: 'my-game',
        engineVersion: '1.2.3',
      });

      expect(readJson(path.join(targetDirectory, 'package.json'))).toEqual({
        name: 'my-game',
        private: true,
        scripts: { dev: 'vite' },
        dependencies: { [enginePackageName]: '1.2.3', other: '^1.0.0' },
        devDependencies: { vite: '^8.0.0' },
      });
    });

    it('writes into an existing directory without deleting its files', () => {
      const targetDirectory = path.join(temporaryDirectory, 'existing');

      mkdirSync(targetDirectory);
      writeFileSync(path.join(targetDirectory, 'notes.txt'), 'keep\n');
      writeFileSync(path.join(targetDirectory, '.gitignore'), 'old\n');

      createProject({
        templateDirectory,
        targetDirectory,
        packageName: 'existing',
        engineVersion: '1.2.3',
      });

      expect(
        readFileSync(path.join(targetDirectory, 'notes.txt'), 'utf8'),
      ).toBe('keep\n');
      expect(
        readFileSync(path.join(targetDirectory, '.gitignore'), 'utf8'),
      ).toBe('node_modules\n');
    });

    it('creates the real template with a .gitignore and package.json', () => {
      const targetDirectory = path.join(temporaryDirectory, 'real');

      createProject({
        templateDirectory: path.join(import.meta.dirname, 'template'),
        targetDirectory,
        packageName: 'real',
        engineVersion: '1.2.3',
      });

      expect(existsSync(path.join(targetDirectory, '.gitignore'))).toBe(true);
      expect(
        readJson(path.join(targetDirectory, 'package.json')),
      ).toMatchObject({
        name: 'real',
        dependencies: { [enginePackageName]: '1.2.3' },
      });
    });
  });
});
