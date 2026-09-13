import * as esbuild from 'esbuild-wasm';
import esbuildWasmUrl from 'esbuild-wasm/esbuild.wasm?url';

let initializePromise: Promise<void> | null = null;

/**
 * Boots the esbuild-wasm binary exactly once, no matter how many times a
 * build is triggered.
 */
export function ensureEsbuildInitialized(): Promise<void> {
  if (!initializePromise) {
    initializePromise = esbuild.initialize({ wasmURL: esbuildWasmUrl });
  }

  return initializePromise;
}

export { esbuild };
