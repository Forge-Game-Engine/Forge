# Forge Playground

A bare-bones, browser-only IDE for writing a small Forge game and downloading
it as a standalone, self-contained web page - no backend involved.

- **Monaco** for the editor, with `@forge-game-engine/forge`'s real type
  declarations registered as extra libs (via `src/editor/forge-types.ts`),
  so autocomplete, hover, and inline diagnostics work against Forge's actual
  public API.
- **`@typescript/vfs`** powers an independent, in-browser TypeScript
  language service (`src/editor/type-check.ts`) that type-checks the game
  source before every build - esbuild only strips types, it never checks
  them.
- **esbuild-wasm** bundles the game's TypeScript, with a custom plugin
  (`src/build/forge-esbuild-plugin.ts`) that resolves
  `@forge-game-engine/forge/<subpath>` imports against Forge's own compiled
  `dist` output (embedded into this app's bundle at build time via
  `import.meta.glob`), so Forge itself is inlined into the output rather
  than referenced externally.
- **fflate** zips the generated `index.html` and bundled `game.js` and
  triggers a browser download.

## Running

From this directory:

```bash
npm install
npm run dev
```

Requires `@forge-game-engine/forge`'s own `dist` to already exist - run
`npm run build` in the repo root first (and again after changing `/src`,
since this app's type/JS registries are snapshotted from `dist` at
dev-server start, same as the documentation site's demos).

## How a build works

1. **Type-check**: the current editor contents are checked against a
   `@typescript/vfs` environment seeded with Forge's real `.d.ts` files.
   Errors are shown and the build stops there.
2. **Bundle**: on success, esbuild-wasm bundles the game source (stdin
   entry point) through the Forge resolver plugin into a single minified
   ES module.
3. **Zip & download**: the bundle is paired with a generated `index.html`
   (`<div id="game">` + `<script type="module" src="./game.js">`, matching
   what `createGame('game')` expects) and zipped client-side for download.

## Limitations

This is intentionally minimal, not a general-purpose bundler:

- Single file only - the editor holds one game file, no multi-file
  projects or a file tree.
- Only resolves Forge's own dependencies needed by its compiled `dist`
  output (currently just `seedrandom`); an arbitrary third-party import in
  your game code won't resolve.
- No visual scene editor - this is a code editor with a build button, nothing more.
