#!/usr/bin/env node

// Runs the golden-image and `@analytic` specs inside the Playwright Docker
// image that matches the pinned `@playwright/test` version, so the result
// never depends on the host's GPU, driver, fonts or browser build.
//
// Usage:
//   node scripts/golden/run-golden.mjs [--update] [playwright args...]
//
// `--update` regenerates the reference images. It only runs in CI, so every
// golden comes from the same kind of runner as the job that checks it.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const packageJson = JSON.parse(
  readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
);
const playwrightVersion = packageJson.devDependencies['@playwright/test'];

if (!/^\d+\.\d+\.\d+$/.test(playwrightVersion)) {
  throw new Error(
    `@playwright/test must be pinned to an exact version for the golden image to match it, found "${playwrightVersion}".`,
  );
}

const image = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;

// The image is published for several architectures, and a software
// rasterizer can round differently on each, so goldens are only ever
// rendered as amd64 (emulated on Apple silicon).
const platform = 'linux/amd64';

// The container's own `node_modules`, kept in a named volume over the
// repository's, so the host's (possibly macOS or Windows) native binaries
// are never used and installs are reused between runs. The lockfile hash
// decides when it's reinstalled.
const nodeModulesVolume = 'forge-golden-node-modules';
const lockHash = createHash('sha256')
  .update(readFileSync(path.join(repoRoot, 'package-lock.json')))
  .digest('hex');

const args = process.argv.slice(2);
const update = args.includes('--update');
const playwrightArgs = args.filter((arg) => arg !== '--update');

if (update && !process.env.CI) {
  console.error(
    'test:golden:update runs only in CI (the golden-update workflow), so every golden comes from the same kind of runner as the job that checks it. Run `npm run test:golden` locally to check your change against the committed goldens.',
  );
  process.exit(1);
}

if (update) {
  playwrightArgs.push('--update-snapshots=changed');
}

const hostUid = typeof process.getuid === 'function' ? process.getuid() : 0;
const hostGid = typeof process.getgid === 'function' ? process.getgid() : 0;

// Files the container writes into the mounted repository (reference images,
// results, the report) would otherwise be owned by its root user.
const ownedOutputs = [
  'e2e/golden/images',
  'e2e/golden-results',
  'e2e/golden-report',
].join(' ');

const containerScript = [
  'set -u',
  'if [ "$(cat node_modules/.forge-golden-lock-hash 2>/dev/null)" != "$FORGE_LOCK_HASH" ]; then',
  '  echo "[golden] installing dependencies inside the container"',
  '  npm ci --no-audit --no-fund --ignore-scripts || exit 1',
  '  echo "$FORGE_LOCK_HASH" > node_modules/.forge-golden-lock-hash',
  'fi',
  'node node_modules/@playwright/test/cli.js test --config e2e/playwright.golden.config.ts "$@"',
  'status=$?',
  `chown -R "$FORGE_HOST_UID:$FORGE_HOST_GID" ${ownedOutputs} 2>/dev/null`,
  'exit $status',
].join('\n');

const dockerArgs = [
  'run',
  '--rm',
  '--init',
  // Chromium needs more shared memory than Docker's 64 MB default.
  '--ipc=host',
  '--platform',
  platform,
  '--volume',
  `${repoRoot}:/work`,
  '--volume',
  `${nodeModulesVolume}:/work/node_modules`,
  '--workdir',
  '/work',
  '--env',
  `FORGE_LOCK_HASH=${lockHash}`,
  '--env',
  `FORGE_HOST_UID=${hostUid}`,
  '--env',
  `FORGE_HOST_GID=${hostGid}`,
  '--env',
  'CI',
  image,
  'bash',
  '-c',
  containerScript,
  'run-golden',
  ...playwrightArgs,
];

console.log(`[golden] running in ${image} (${platform})`);

const result = spawnSync('docker', dockerArgs, { stdio: 'inherit' });

if (result.error) {
  console.error(
    `[golden] could not start Docker: ${result.error.message}. The golden suite runs only inside the pinned Playwright image.`,
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
