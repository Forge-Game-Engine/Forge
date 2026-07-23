#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');
const changelogPath = join(projectRoot, 'CHANGELOG.md');

/**
 * Moves the contents of the `## [Unreleased]` section into a new dated
 * version section, leaving a fresh empty `## [Unreleased]` section behind.
 * @param {string} changelog - The current contents of CHANGELOG.md.
 * @param {string} version - The new version being released, e.g. "1.2.0" (no leading "v").
 * @param {string} date - The release date in YYYY-MM-DD format.
 * @returns {string} The updated CHANGELOG.md contents.
 */
export function promoteUnreleased(changelog, version, date) {
  const unreleasedHeader = '## [Unreleased]';
  const unreleasedIndex = changelog.indexOf(unreleasedHeader);

  if (unreleasedIndex === -1) {
    throw new Error('Could not find "## [Unreleased]" section in CHANGELOG.md');
  }

  const contentStart = unreleasedIndex + unreleasedHeader.length;
  const nextHeadingIndex = changelog.indexOf('\n## [', contentStart);

  if (nextHeadingIndex === -1) {
    throw new Error(
      'CHANGELOG.md is not in the expected format (missing the next version heading).',
    );
  }

  const before = changelog.slice(0, unreleasedIndex);
  const unreleasedBody = changelog.slice(contentStart, nextHeadingIndex).trim();
  const after = changelog.slice(nextHeadingIndex + 1);

  const versionBody = unreleasedBody || '_No user-facing changes._';
  const newVersionSection = `## [${version}] - ${date}\n\n${versionBody}\n`;

  return `${before}${unreleasedHeader}\n\n${newVersionSection}\n${after}`;
}

function main() {
  const versionArg = process.argv
    .slice(2)
    .find((arg) => arg.startsWith('--version='));

  if (!versionArg) {
    console.error(
      'Usage: node scripts/changelog/promote-unreleased.mjs --version=X.Y.Z',
    );
    process.exit(1);
  }

  const version = versionArg.split('=')[1];
  const changelog = readFileSync(changelogPath, 'utf8');
  const date = new Date().toISOString().slice(0, 10);
  const updated = promoteUnreleased(changelog, version, date);

  writeFileSync(changelogPath, updated);
  console.log(`CHANGELOG.md updated for v${version}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
