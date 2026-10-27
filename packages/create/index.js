#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import {
  createProject,
  defaultTargetDirectory,
  detectPackageManager,
  getNextSteps,
  isEmptyDirectory,
  parseArguments,
  toValidPackageName,
} from './create.js';

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

const usage = `Usage: npm create @forge-game-engine@latest [directory]

Creates a new Forge game project in the directory (default: ${defaultTargetDirectory}).
Pass . to create it in the current directory.

Options:
  -h, --help  Show this message`;

/**
 * Asks the user a question in the terminal.
 * @param {string} question - The question to print.
 * @returns {Promise<string>} The trimmed answer.
 */
const ask = async (question) => {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await readline.question(question);

    return answer.trim();
  } finally {
    readline.close();
  }
};

/**
 * Reads the version of this package, which is the engine version its
 * template was written for.
 * @returns {string} The version.
 * @throws An error when the package's `package.json` has no version.
 */
const readOwnVersion = () => {
  /** @type {unknown} */
  const packageJson = JSON.parse(
    readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'),
  );

  if (
    typeof packageJson !== 'object' ||
    packageJson === null ||
    !('version' in packageJson) ||
    typeof packageJson.version !== 'string'
  ) {
    throw new Error(`The ${packageDirectory} package.json has no version.`);
  }

  return packageJson.version;
};

/**
 * Finds the directory to create the project in, asking for it when the
 * command line didn't give one and there's a terminal to ask in.
 * @param {string | undefined} targetDirectory - The directory from the command line, if any.
 * @param {boolean} isInteractive - Whether the CLI can prompt.
 * @returns {Promise<string>} The directory.
 */
const resolveTargetDirectory = async (targetDirectory, isInteractive) => {
  if (targetDirectory !== undefined) {
    return targetDirectory;
  }

  if (!isInteractive) {
    return defaultTargetDirectory;
  }

  const answer = await ask(`Project directory (${defaultTargetDirectory}): `);

  return answer === '' ? defaultTargetDirectory : answer;
};

/**
 * Checks that a project can be created in a directory: it doesn't exist, is
 * empty, or the user agreed to write the template into it.
 * @param {string} directory - The resolved directory.
 * @param {boolean} isInteractive - Whether the CLI can prompt.
 * @returns {Promise<boolean>} Whether to go ahead.
 * @throws An error when the path is a file, or the directory isn't empty and there's no terminal to ask in.
 */
const confirmTargetDirectory = async (directory, isInteractive) => {
  if (!existsSync(directory)) {
    return true;
  }

  if (!statSync(directory).isDirectory()) {
    throw new Error(`"${directory}" exists and isn't a directory.`);
  }

  if (isEmptyDirectory(directory)) {
    return true;
  }

  if (!isInteractive) {
    throw new Error(
      `"${directory}" isn't empty. Choose an empty directory, or run this in a terminal to confirm.`,
    );
  }

  const answer = await ask(
    `"${directory}" isn't empty. Write the template into it? Files with the same name are replaced; nothing is deleted. (y/N) `,
  );

  return /^y(es)?$/i.test(answer);
};

const main = async () => {
  const { help, targetDirectory } = parseArguments(process.argv.slice(2));

  if (help) {
    console.log(usage);

    return;
  }

  const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const target = await resolveTargetDirectory(targetDirectory, isInteractive);
  const resolvedTarget = path.resolve(target);

  if (!(await confirmTargetDirectory(resolvedTarget, isInteractive))) {
    console.log('Cancelled.');
    process.exitCode = 1;

    return;
  }

  createProject({
    templateDirectory: path.join(packageDirectory, 'template'),
    targetDirectory: resolvedTarget,
    packageName: toValidPackageName(path.basename(resolvedTarget)),
    engineVersion: readOwnVersion(),
  });

  const packageManager = detectPackageManager(
    process.env['npm_config_user_agent'],
  );
  const nextSteps = getNextSteps(resolvedTarget, process.cwd(), packageManager);

  console.log(`\nCreated a Forge project in ${resolvedTarget}.\n\nNext steps:`);

  for (const step of nextSteps) {
    console.log(`  ${step}`);
  }
};

main().catch((/** @type {unknown} */ error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
