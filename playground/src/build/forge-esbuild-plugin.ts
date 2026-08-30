import type { Plugin, PluginBuild } from 'esbuild-wasm';

import {
  forgeDistJsFiles,
  forgeSubpaths,
  resolveForgeSubpath,
  seedrandomFiles,
} from '../forge-registry.js';

const forgeNamespace = 'forge-dist';
const seedrandomNamespace = 'npm-seedrandom';
const forgeSpecifierPrefix = '@forge-game-engine/forge/';
const forgeSpecifierPattern = /^@forge-game-engine\/forge\//;

/**
 * Resolves a relative import (`./x`, `../x`) against a flat map of a
 * package's files, trying the path as given and then the usual Node
 * extension/index fallbacks (Forge's own dist imports are always fully
 * `.js`-specified, but its `seedrandom` dependency is CommonJS and omits
 * extensions).
 */
function resolveRelative(
  files: Map<string, string>,
  fromPath: string,
  importPath: string,
): string {
  const fromDir = fromPath.includes('/')
    ? fromPath.slice(0, fromPath.lastIndexOf('/'))
    : '';
  const segments = `${fromDir}/${importPath}`.split('/');
  const resolvedSegments: string[] = [];

  for (const segment of segments) {
    if (segment === '' || segment === '.') {
      continue;
    }

    if (segment === '..') {
      resolvedSegments.pop();
      continue;
    }

    resolvedSegments.push(segment);
  }

  const joined = resolvedSegments.join('/');
  const candidates = [joined, `${joined}.js`, `${joined}/index.js`];
  const match = candidates.find((candidate) => files.has(candidate));

  if (!match) {
    throw new Error(`Unable to resolve "${importPath}" from "${fromPath}".`);
  }

  return match;
}

/**
 * An esbuild-wasm plugin that resolves `@forge-game-engine/forge/<subpath>`
 * imports (plus Forge's own internal relative imports and its `seedrandom`
 * runtime dependency) against Forge's compiled dist output, which is
 * embedded into the playground bundle at build time via
 * `import.meta.glob`. This lets a user's game `import` Forge exactly as a
 * published package would, with esbuild-wasm bundling everything into a
 * single, self-contained file entirely in the browser.
 */
export function createForgeResolverPlugin(): Plugin {
  return {
    name: 'forge-dist-resolver',
    setup(build: PluginBuild) {
      build.onResolve({ filter: forgeSpecifierPattern }, (args) => {
        const subpath = args.path.slice(forgeSpecifierPrefix.length);
        const resolved = resolveForgeSubpath(subpath);

        if (!resolved) {
          return {
            errors: [
              {
                text: `"${args.path}" is not a published Forge module. Available: ${forgeSubpaths
                  .map((available) => `${forgeSpecifierPrefix}${available}`)
                  .join(', ')}`,
              },
            ],
          };
        }

        return { path: resolved.jsPath, namespace: forgeNamespace };
      });

      // `onResolve` callbacks with no `namespace` only fire for importers in
      // the default namespace, so Forge's own internal imports (whose
      // importer is always in `forgeNamespace`) need their own callback -
      // this one handles both Forge's relative imports and its bare
      // `seedrandom` dependency. Anything else (e.g. `seedrandom` itself
      // conditionally `require`-ing Node's `crypto`) is left unhandled so
      // esbuild's own `external` option gets a chance at it instead.
      build.onResolve(
        { filter: /.*/, namespace: forgeNamespace },
        (args) => {
          if (args.path === 'seedrandom') {
            return { path: 'index.js', namespace: seedrandomNamespace };
          }

          if (args.path.startsWith('.')) {
            return {
              path: resolveRelative(
                forgeDistJsFiles,
                args.importer,
                args.path,
              ),
              namespace: forgeNamespace,
            };
          }

          return undefined;
        },
      );

      build.onResolve(
        { filter: /.*/, namespace: seedrandomNamespace },
        (args) => {
          if (!args.path.startsWith('.')) {
            return undefined;
          }

          return {
            path: resolveRelative(seedrandomFiles, args.importer, args.path),
            namespace: seedrandomNamespace,
          };
        },
      );

      build.onLoad({ filter: /.*/, namespace: forgeNamespace }, (args) => ({
        contents: forgeDistJsFiles.get(args.path),
        loader: 'js',
      }));

      build.onLoad(
        { filter: /.*/, namespace: seedrandomNamespace },
        (args) => ({
          contents: seedrandomFiles.get(args.path),
          loader: 'js',
        }),
      );
    },
  };
}
