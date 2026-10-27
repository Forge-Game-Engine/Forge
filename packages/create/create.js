import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

/**
 * A package manager the next steps can be printed for.
 * @typedef {'npm' | 'pnpm' | 'yarn' | 'bun'} PackageManager
 */

/**
 * The parsed command line.
 * @typedef {object} CliArguments
 * @property {boolean} help - Whether usage was asked for.
 * @property {string | undefined} targetDirectory - The directory to create the project in, if one was given.
 */

/**
 * What {@link createProject} needs to create a project.
 * @typedef {object} CreateProjectOptions
 * @property {string} templateDirectory - The template to copy.
 * @property {string} targetDirectory - The directory to copy it into.
 * @property {string} packageName - The `name` to give the project's `package.json`.
 * @property {string} engineVersion - The `@forge-game-engine/forge` version the project depends on.
 */

/** The directory a project is created in when none is given. */
export const defaultTargetDirectory = 'forge-game';

/** The engine package every project depends on. */
export const enginePackageName = '@forge-game-engine/forge';

/** @type {readonly PackageManager[]} */
const packageManagers = ['npm', 'pnpm', 'yarn', 'bun'];

/**
 * Template files stored under another name, because npm leaves files such
 * as `.gitignore` out of a published package.
 * @type {ReadonlyMap<string, string>}
 */
const renamedTemplateFiles = new Map([['_gitignore', '.gitignore']]);

/**
 * Parses the CLI's arguments (without the `node` and script paths).
 * @param {readonly string[]} args - The arguments to parse.
 * @returns {CliArguments} The parsed arguments.
 * @throws An error for an unknown option or more than one directory.
 */
export const parseArguments = (args) => {
  /** @type {string[]} */
  const positionals = [];

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      return { help: true, targetDirectory: undefined };
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option "${arg}".`);
    }

    positionals.push(arg);
  }

  if (positionals.length > 1) {
    throw new Error(
      `Expected at most one directory, got ${positionals.length}: ${positionals.join(', ')}.`,
    );
  }

  return { help: false, targetDirectory: positionals[0] };
};

/**
 * Turns a directory name into a valid npm package name: lowercase, with
 * whitespace and characters npm doesn't allow replaced by `-`, and no
 * leading `.` or `_`.
 * @param {string} name - The name to convert.
 * @returns {string} A valid package name, or {@link defaultTargetDirectory} when nothing valid is left.
 */
export const toValidPackageName = (name) => {
  const packageName = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z\d\-~._]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-._]+/, '')
    .replace(/-$/, '');

  return packageName === '' ? defaultTargetDirectory : packageName;
};

/**
 * Finds the package manager that ran the CLI from the `npm_config_user_agent`
 * environment variable npm, pnpm, Yarn and Bun set (e.g.
 * `pnpm/9.12.0 npm/? node/v22.11.0 linux x64`).
 * @param {string | undefined} userAgent - The user agent, if any.
 * @returns {PackageManager} The package manager, `npm` when it isn't one of the supported ones.
 */
export const detectPackageManager = (userAgent) => {
  const name = userAgent?.split(' ')[0]?.split('/')[0];

  return (
    packageManagers.find((packageManager) => packageManager === name) ?? 'npm'
  );
};

/**
 * Lists the commands to run in a newly created project.
 * @param {string} targetDirectory - The project's directory.
 * @param {string} currentDirectory - The directory the CLI ran in.
 * @param {PackageManager} packageManager - The package manager to run.
 * @returns {string[]} The commands, in order.
 */
export const getNextSteps = (
  targetDirectory,
  currentDirectory,
  packageManager,
) => {
  const relativeDirectory = path.relative(
    currentDirectory,
    path.resolve(currentDirectory, targetDirectory),
  );
  const installSteps = [
    `${packageManager} install`,
    `${packageManager} run dev`,
  ];

  if (relativeDirectory === '') {
    return installSteps;
  }

  const quotedDirectory = /\s/.test(relativeDirectory)
    ? `"${relativeDirectory}"`
    : relativeDirectory;

  return [`cd ${quotedDirectory}`, ...installSteps];
};

/**
 * Checks whether a directory has nothing in it but, optionally, a `.git`
 * folder, so a project can be created in a freshly initialized repository.
 * @param {string} directory - The directory to check. It must exist.
 * @returns {boolean} Whether the directory is empty.
 */
export const isEmptyDirectory = (directory) =>
  readdirSync(directory).every((entry) => entry === '.git');

/**
 * Copies a template directory into a target directory, recursively, giving
 * files stored under another name (`_gitignore`) their real names. Existing
 * files with the same name are replaced; nothing else is deleted.
 * @param {string} templateDirectory - The directory to copy.
 * @param {string} targetDirectory - The directory to copy it into. It's created if it doesn't exist.
 */
export const copyTemplate = (templateDirectory, targetDirectory) => {
  mkdirSync(targetDirectory, { recursive: true });

  for (const entry of readdirSync(templateDirectory, { withFileTypes: true })) {
    const source = path.join(templateDirectory, entry.name);
    const destination = path.join(
      targetDirectory,
      renamedTemplateFiles.get(entry.name) ?? entry.name,
    );

    if (entry.isDirectory()) {
      copyTemplate(source, destination);

      continue;
    }

    copyFileSync(source, destination);
  }
};

/**
 * Gives a project's `package.json` its name and makes it depend on exactly
 * the given engine version.
 * @param {string} projectDirectory - The directory holding the `package.json`.
 * @param {string} packageName - The project's package name.
 * @param {string} engineVersion - The `@forge-game-engine/forge` version to depend on.
 * @throws An error when the `package.json` doesn't hold a JSON object.
 */
export const stampPackageJson = (
  projectDirectory,
  packageName,
  engineVersion,
) => {
  const packageJsonPath = path.join(projectDirectory, 'package.json');

  /** @type {unknown} */
  const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`"${packageJsonPath}" doesn't hold a JSON object.`);
  }

  const packageJson =
    /** @type {{ name?: string, dependencies?: Record<string, string> }} */ (
      parsed
    );

  packageJson.name = packageName;
  packageJson.dependencies = {
    ...packageJson.dependencies,
    [enginePackageName]: engineVersion,
  };

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
};

/**
 * Creates a project: copies the template into the target directory and
 * stamps the copied `package.json` with the project's name and engine version.
 * @param {CreateProjectOptions} options - What to create and where.
 */
export const createProject = ({
  templateDirectory,
  targetDirectory,
  packageName,
  engineVersion,
}) => {
  copyTemplate(templateDirectory, targetDirectory);
  stampPackageJson(targetDirectory, packageName, engineVersion);
};
