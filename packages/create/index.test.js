// @vitest-environment node
import { spawnSync } from 'node:child_process';
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
import { enginePackageName } from './create.js';

const cliPath = path.join(import.meta.dirname, 'index.js');

/** @type {unknown} */
const ownPackageJson = JSON.parse(
  readFileSync(path.join(import.meta.dirname, 'package.json'), 'utf8'),
);

/**
 * Runs the CLI without a terminal, as CI would.
 * @param {string[]} args - The CLI's arguments.
 * @param {string} cwd - The directory to run it in.
 * @param {string} [userAgent] - The `npm_config_user_agent` to run it with.
 * @returns {import('node:child_process').SpawnSyncReturns<string>} The finished process.
 */
const runCli = (args, cwd, userAgent = 'pnpm/9.12.0 npm/? node/v22.11.0') =>
  spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ['npm_config_user_agent']: userAgent },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

describe('create-forge', () => {
  /** @type {string} */
  let temporaryDirectory;

  beforeEach(() => {
    temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'forge-create-cli-'));
  });

  afterEach(() => {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('creates a project named after its directory, pinned to its own version', () => {
    const result = runCli(['my-game'], temporaryDirectory);
    const projectDirectory = path.join(temporaryDirectory, 'my-game');

    expect(result.status).toBe(0);
    expect(existsSync(path.join(projectDirectory, '.gitignore'))).toBe(true);
    expect(existsSync(path.join(projectDirectory, '_gitignore'))).toBe(false);
    expect(
      JSON.parse(
        readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'),
      ),
    ).toMatchObject({
      name: 'my-game',
      dependencies: {
        [enginePackageName]: /** @type {{ version: string }} */ (ownPackageJson)
          .version,
      },
    });
    expect(result.stdout).toContain(
      '  cd my-game\n  pnpm install\n  pnpm run dev\n',
    );
  });

  it('uses the default directory without a terminal to ask in', () => {
    const result = runCli([], temporaryDirectory);

    expect(result.status).toBe(0);
    expect(
      existsSync(path.join(temporaryDirectory, 'forge-game', 'package.json')),
    ).toBe(true);
  });

  it('creates the project in the current directory for .', () => {
    const projectDirectory = path.join(temporaryDirectory, 'Here Game');

    mkdirSync(projectDirectory);

    const result = runCli(['.'], projectDirectory, 'npm/10.9.0 node/v22.11.0');

    expect(result.status).toBe(0);
    expect(
      JSON.parse(
        readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'),
      ),
    ).toMatchObject({ name: 'here-game' });
    expect(result.stdout).not.toContain('cd ');
    expect(result.stdout).toContain('  npm install\n  npm run dev\n');
  });

  it('aborts for a directory that is not empty without a terminal', () => {
    const projectDirectory = path.join(temporaryDirectory, 'taken');

    mkdirSync(projectDirectory);
    writeFileSync(path.join(projectDirectory, 'notes.txt'), 'keep\n');

    const result = runCli(['taken'], temporaryDirectory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("isn't empty");
    expect(existsSync(path.join(projectDirectory, 'package.json'))).toBe(false);
  });

  it('fails when the target is a file', () => {
    writeFileSync(path.join(temporaryDirectory, 'file'), '');

    const result = runCli(['file'], temporaryDirectory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("exists and isn't a directory");
  });

  it('fails for an unknown option', () => {
    const result = runCli(['--template', 'x'], temporaryDirectory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unknown option "--template".');
  });

  it('prints usage for --help', () => {
    const result = runCli(['--help'], temporaryDirectory);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'Usage: npm create @forge-game-engine@latest [directory]',
    );
  });
});
