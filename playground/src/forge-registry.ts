/**
 * Central registry of Forge's built `dist` output and the handful of raw
 * TypeScript files the in-browser tooling needs, all embedded into the
 * playground bundle at dev/build time via Vite's `import.meta.glob`. This
 * gives the Monaco editor and the esbuild-wasm bundler access to Forge's
 * actual compiled JS and type declarations without a backend.
 */
import forgePackageJson from '../../package.json';

const forgeDistRoot = '/node_modules/@forge-game-engine/forge/dist/';
const seedrandomRoot = '/node_modules/seedrandom/';
const typescriptLibRoot = '/node_modules/typescript/lib/';

const rawForgeJsFiles = import.meta.glob(
  '/node_modules/@forge-game-engine/forge/dist/**/*.js',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const rawForgeDtsFiles = import.meta.glob(
  '/node_modules/@forge-game-engine/forge/dist/**/*.d.ts',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const rawSeedrandomFiles = import.meta.glob(
  [
    '/node_modules/seedrandom/index.js',
    '/node_modules/seedrandom/seedrandom.js',
    '/node_modules/seedrandom/lib/*.js',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const rawTypescriptLibFiles = import.meta.glob(
  '/node_modules/typescript/lib/lib*.d.ts',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

function stripPrefix(
  files: Record<string, string>,
  prefix: string,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const [path, contents] of Object.entries(files)) {
    map.set(path.slice(prefix.length), contents);
  }

  return map;
}

/** Forge's compiled JS, keyed by path relative to `dist/` (e.g. `ecs/index.js`). */
export const forgeDistJsFiles = stripPrefix(rawForgeJsFiles, forgeDistRoot);

/** Forge's type declarations, keyed by path relative to `dist/` (e.g. `ecs/index.d.ts`). */
export const forgeDistDtsFiles = stripPrefix(rawForgeDtsFiles, forgeDistRoot);

/** `seedrandom`'s CommonJS source, keyed by path relative to its package root. */
export const seedrandomFiles = stripPrefix(rawSeedrandomFiles, seedrandomRoot);

/** TypeScript's own `lib.*.d.ts` files, keyed by bare filename (e.g. `lib.dom.d.ts`). */
export const typescriptLibFiles = stripPrefix(
  rawTypescriptLibFiles,
  typescriptLibRoot,
);

interface ForgeExportEntry {
  import: {
    types: string;
    default: string;
  };
}

const forgeExports = forgePackageJson.exports as Record<
  string,
  ForgeExportEntry
>;

/**
 * The public `@forge-game-engine/forge/<subpath>` import specifiers a game
 * may use (e.g. `ecs`, `rendering`, `fsm`), derived from the package's own
 * `exports` map so the playground never drifts from what's actually
 * published.
 */
export const forgeSubpaths = Object.keys(forgeExports).map((key) =>
  key.slice('./'.length),
);

/**
 * Resolves a `@forge-game-engine/forge/<subpath>` import specifier to its
 * dist-relative `.js` and `.d.ts` paths, or `null` if the subpath isn't a
 * published export.
 */
export function resolveForgeSubpath(
  subpath: string,
): { jsPath: string; dtsPath: string } | null {
  const entry = forgeExports[`./${subpath}`];

  if (!entry) {
    return null;
  }

  return {
    jsPath: entry.import.default.replace(/^\.\/dist\//, ''),
    dtsPath: entry.import.types.replace(/^\.\/dist\//, ''),
  };
}
