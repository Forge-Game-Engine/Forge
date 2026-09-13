import { typescriptDefaults } from 'monaco-editor/languages/features/typescript/register.js';

import {
  forgeDistDtsFiles,
  forgeSubpaths,
  resolveForgeSubpath,
} from '../forge-registry.js';

const packageRoot = 'file:///node_modules/@forge-game-engine/forge';

/**
 * Registers Forge's type declarations with Monaco's TypeScript language
 * service as extra libs, so the editor gives real completions, hover info,
 * and diagnostics against `@forge-game-engine/forge/<subpath>` imports -
 * the same public API a published game would use.
 */
export function registerForgeTypes(): void {
  const defaults = typescriptDefaults;

  for (const [relativePath, contents] of forgeDistDtsFiles) {
    defaults.addExtraLib(contents, `${packageRoot}/dist/${relativePath}`);
  }

  // Node's classic module resolution looks for `<package>/<subpath>/index.d.ts`.
  // Forge's public subpaths (declared in its package.json `exports` map)
  // don't always share a name with the real dist folder they point at (e.g.
  // `fsm` -> `finite-state-machine`), so each gets a tiny re-export shim at
  // the path resolution actually expects.
  for (const subpath of forgeSubpaths) {
    const resolved = resolveForgeSubpath(subpath);

    if (!resolved) {
      continue;
    }

    const jsPath = resolved.dtsPath.replace(/\.d\.ts$/, '.js');

    defaults.addExtraLib(
      `export * from '../dist/${jsPath}';`,
      `${packageRoot}/${subpath}/index.d.ts`,
    );
  }
}
