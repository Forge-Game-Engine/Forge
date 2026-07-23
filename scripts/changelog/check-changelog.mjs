#!/usr/bin/env node

import { execSync } from 'node:child_process';

import {
  isExcludedType,
  parseConventionalCommit,
} from './parse-conventional-commit.mjs';

/**
 * Runs a shell command from the repo root and returns its trimmed stdout.
 * @param {string} command - The command to run.
 * @returns {string} The command's stdout.
 */
function sh(command) {
  return execSync(command, { encoding: 'utf8' });
}

/**
 * Checks that a pull request touching release-note-worthy commit types
 * (anything other than chore, style, refactor, test, ci, docs, build) also
 * adds a bullet under the `## [Unreleased]` heading in CHANGELOG.md.
 * @param {string} prTitle - The pull request title (becomes the squash commit message).
 * @param {string} baseRef - The base branch the PR targets, e.g. "dev".
 * @returns {string | null} An error message if the check fails, otherwise null.
 */
export function checkChangelog(prTitle, baseRef) {
  const parsed = parseConventionalCommit(prTitle);

  if (parsed && isExcludedType(parsed.type)) {
    return null;
  }

  const diff = sh(`git diff origin/${baseRef}...HEAD -- CHANGELOG.md`);
  const addedBullet = /^\+- /m.test(diff);

  if (addedBullet) {
    return null;
  }

  const reason = parsed
    ? `its type ("${parsed.type}") is release-note-worthy`
    : 'its title is not a recognized Conventional Commits type';

  return [
    `This pull request needs a CHANGELOG.md entry because ${reason}.`,
    '',
    'Add a bullet under the "## [Unreleased]" heading in CHANGELOG.md, in the',
    'appropriate Keep a Changelog category (Added/Changed/Fixed/Removed/Deprecated/Security).',
    '',
    'If this change genuinely has no user-facing effect, retitle the PR with an',
    'excluded type (chore, style, refactor, test, ci, docs, build) instead.',
  ].join('\n');
}

function main() {
  const prTitle = process.env.PR_TITLE;
  const baseRef = process.env.BASE_REF;

  if (!prTitle || !baseRef) {
    console.error('PR_TITLE and BASE_REF environment variables are required.');
    process.exit(1);
  }

  const error = checkChangelog(prTitle, baseRef);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log('Changelog check passed.');
}

main();
