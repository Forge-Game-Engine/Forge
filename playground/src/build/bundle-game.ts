import type { Message } from 'esbuild-wasm';

import { createForgeResolverPlugin } from './forge-esbuild-plugin.js';
import { esbuild, ensureEsbuildInitialized } from './esbuild-setup.js';

export interface BundleGameResult {
  code: string;
  warnings: Message[];
}

/**
 * Thrown when esbuild-wasm fails to bundle the game (a syntax error or an
 * unresolvable import). `errors` mirrors esbuild's own diagnostic format so
 * callers can show file/line-accurate messages.
 */
export class BundleGameError extends Error {
  public readonly errors: Message[];

  constructor(errors: Message[]) {
    super(errors.map((error) => error.text).join('\n') || 'Build failed.');
    this.name = 'BundleGameError';
    this.errors = errors;
  }
}

/**
 * Transpiles and bundles a single-file Forge game's TypeScript source into a
 * single, self-contained ES module, with Forge itself inlined. Runs
 * entirely in the browser via esbuild-wasm.
 * @param source - The game's TypeScript source code.
 * @returns The bundled JavaScript and any non-fatal warnings.
 * @throws {BundleGameError} If the source fails to parse or an import can't be resolved.
 */
export async function bundleGame(source: string): Promise<BundleGameResult> {
  await ensureEsbuildInitialized();

  try {
    const result = await esbuild.build({
      stdin: {
        contents: source,
        loader: 'ts',
        sourcefile: 'game.ts',
      },
      bundle: true,
      write: false,
      format: 'esm',
      target: 'es2022',
      minify: true,
      // `seedrandom` (a Forge dependency, used by `Random`) conditionally
      // `require`s Node's `crypto` module purely for extra entropy when
      // running under Node - dead code in a browser bundle, but esbuild
      // still needs to resolve it statically since the `require` sits in a
      // CommonJS module. Marking it external leaves the (never-reached)
      // call as-is instead of failing the build.
      external: ['crypto'],
      plugins: [createForgeResolverPlugin()],
    });

    return { code: result.outputFiles[0].text, warnings: result.warnings };
  } catch (error) {
    const errors = (error as { errors?: Message[] }).errors;

    if (errors) {
      throw new BundleGameError(errors);
    }

    throw error;
  }
}
