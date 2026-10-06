# Design: Font Atlases Load From Two Explicit URLs

|                                       |                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Status**                            | Implemented. `documentation-site/docs/docs/text` describes current behavior                      |
| **Kind**                              | Defect                                                                                           |
| **Found in**                          | Galactic Journey demo: `src/ui/create-ui.ts` (fonts served from `public/` to avoid hashed names) |
| **Engine version at time of writing** | `0.25.8`                                                                                         |
| **Related**                           | [`sprite-textures.md`](./sprite-textures.md)                                                     |

## 0. Targeted modules

| Path                                                                                               | Change   | Notes                                                                             |
| -------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `src/text/font-atlas/font-atlas-cache.ts`                                                          | Modified | `getOrLoad({ metricsUrl, imageUrl })`; in-flight loads shared; no path resolution |
| `src/text/font-atlas/font-atlas-file-data.ts`, `font-atlas-data.ts`, `validate-font-atlas-data.ts` | Modified | `atlasImage` no longer part of the data                                           |
| `scripts/generate-font-atlas.mjs`                                                                  | Modified | Stops writing `atlasImage`                                                        |
| `assets/fonts/default/default.json`, `documentation-site/static/fonts/default/default.json`        | Modified | `atlasImage` removed                                                              |
| `package.json`                                                                                     | Modified | An `exports` subpath for the shipped default font's files                         |
| `documentation-site/docs/docs/text/*.md`, `ui/labels-and-text.md`, `asset-loading/index.md`, demos | Modified | Both URLs; importing them through a bundler                                       |

---

## 1. Summary

`FontAtlasCache.getOrLoad(jsonUrl)` fetches the atlas's metrics JSON, reads
the image file name stored in it (`atlasImage`), and loads the image from
the JSON's directory. That only works if the image is served next to the
JSON under its original name.

Bundlers don't do that: Vite, webpack and others give imported assets
content-hashed names, so the image the JSON names doesn't exist in a
build. The demo keeps its fonts out of the bundle, in `public/`, with a
comment explaining why. The resolution is also a hand-rolled string
slice of the JSON URL, which breaks on a `/` inside a query string or
fragment, on `data:` and `blob:` URLs, and on an absolute `atlasImage`.

The engine's own default font has the same problem from the other side:
the package ships its files, but `package.json`'s `exports` has no path to
them, so a bundler can't import them either. The text guide tells users to
copy them out of `node_modules` by hand.

This design has the caller pass both URLs, which any bundler can produce,
and exports the default font's files so they can be imported like any
other asset.

---

## 2. Scope

### In scope

- `FontAtlasCache` taking both URLs.
- Dropping `atlasImage` from the loaded data, the generator's output and
  the committed default font JSONs.
- An `exports` subpath for the default font.
- Docs: importing font atlases through a bundler.

### Out of scope

- **A single-file atlas format** (image embedded in the JSON). Larger
  downloads, and the two-file output works with every bundler once the
  loader stops guessing.
- **Loading fonts as `Texture`s.** That follows from
  [`sprite-textures.md`](./sprite-textures.md).

---

## 3. How established engines handle this

- **Phaser**: `load.bitmapFont(key, textureURL, fontDataURL)`: the caller
  passes both.
- **Babylon.js**: `new FontAsset(definitionData, textureUrl)`: the font
  definition (the JSON's contents) and the texture's URL, separately.
- **three.js** with `three-bmfont-text`: the definition and the atlas
  texture are loaded by the caller with the usual loaders.
- **PixiJS** (v8 `loadBitmapFont`) does what Forge does today: it
  resolves the page image next to the font file. It handles hashed names
  through its own asset pipeline (AssetPack), which rewrites the files
  together. Forge has no asset pipeline and relies on the game's bundler,
  which can only rewrite URLs it sees, so both files have to be imported
  by the game.
- **Unity, Godot**: fonts are imported assets with their atlas inside;
  there's no runtime URL to resolve.

---

## 4. Design

```ts
class FontAtlasCache {
  /** Loads (once) the atlas whose metrics are at `metricsUrl`. */
  getOrLoad(urls: { metricsUrl: string; imageUrl: string }): Promise<FontAtlas>;
  /** The atlas loaded from `metricsUrl`. */
  get(metricsUrl: string): FontAtlas;
}
```

- **Keying and concurrency.** The cache is keyed by `metricsUrl`. It
  records `{ imageUrl, promise }` when a load starts, so concurrent calls
  for the same atlas (the guide's `Promise.all` pattern) share one load,
  and a call naming a different image URL for the same metrics throws,
  whether the first load has finished or not. The comparison is against
  the requested string, not the image's `src`, which the browser rewrites
  to an absolute URL.
- **Pairing check.** The caller now pairs the two files, so the cache
  checks the loaded image's natural size against the JSON's `atlasSize`
  (which the shaders depend on) and throws on a mismatch, naming both
  URLs.
- **Encapsulation.** `getOrLoad` and `get` are the public API; `load` and
  the `assets` map become private. `FontAtlasCache` no longer implements
  `AssetCache`, whose single-key `load` doesn't fit two URLs. Nothing uses
  `AssetCache` polymorphically, but two guides describe it as the font
  cache's contract (`asset-loading/index.md`, `text/index.md`) and are
  updated.
- **Data.** `atlasImage` is removed from `FontAtlasData`, its validation,
  the generator's output and the two committed JSON files. Files that
  still contain it load normally: the validator ignores fields it doesn't
  know. `formatVersion` stays `2`; bumping it would reject every existing
  file for no benefit.

With Vite, a game imports both files and passes the results:

```ts
import fontMetricsUrl from './fonts/my-font.json?url';
import fontImageUrl from './fonts/my-font.png';

const font = await fontAtlasCache.getOrLoad({
  metricsUrl: fontMetricsUrl,
  imageUrl: fontImageUrl,
});
```

The default font is imported the same way, through a new `exports`
subpath (`@forge-game-engine/forge/fonts/default/default.json` and
`.png`), which `check-exports` must accept. The "copy these files out of
`node_modules`" instructions in the text guide are deleted.

---

## 5. Phases

### Phase 1: Explicit URLs

| #   | Task                                                                                                                                                                                                                             | Size |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `getOrLoad({ metricsUrl, imageUrl })`; in-flight sharing and conflict check; size check; `load`/`assets` private; `resolveRelativeToKey` deleted                                                                                 | M    |
| 1.2 | `atlasImage` removed from data, validation, the generator and the two committed JSONs                                                                                                                                            | S    |
| 1.3 | `exports` subpath for the default font; `check-exports` passes                                                                                                                                                                   | S    |
| 1.4 | Unit tests: the six test files that build `atlasImage`; new tests in §8                                                                                                                                                          | S    |
| 1.5 | Migrate the 13 docs demos (`_create-game.ts` and their `index.tsx` URL builders) and the stale synthetic atlas in `e2e/fixtures/scenes/text-effects-overlap.ts`                                                                  | S    |
| 1.6 | Guides: `text/index.md`, `text/loading-a-font-atlas.md` (with a bundler example), `text/rendering-text.md`, `text/generating-a-font-atlas.md`, `ui/labels-and-text.md`, `asset-loading/index.md`; changelog under `#### Changed` | M    |

**Definition of done:** a font atlas, including the engine's default
font, imported through Vite loads in a production build with hashed asset
names.

---

## 6. Decision log

### DL-1: Always both URLs, not an optional image URL

**Options.** (a) Both URLs, always. (b) The image URL optional, falling
back to the JSON-relative name.

**Decision: (a).**

**Rationale.** (b) keeps the path that breaks under a bundler as the
default and adds a second way to load the same thing. Passing two URLs is
one extra line for a game that serves files unbundled.

### DL-2: Validate the pairing

**Rationale.** With the image named by the caller, a mismatched PNG is a
new possible mistake, and its symptom (garbled glyphs) is far from its
cause. Comparing the image's size with `atlasSize` catches it at load time
for the cost of one comparison.

---

## 7. Open questions

None.

---

## 8. Testing considerations

- Loads with unrelated URLs for metrics and image (different directories,
  query strings, `blob:` URLs).
- Two concurrent `getOrLoad` calls fetch once; a concurrent call with a
  different image URL throws.
- An image whose size doesn't match `atlasSize` throws.
- JSON with and without `atlasImage` validates.

## 9. Documentation and demo follow-up

- The guides in task 1.6: both URLs, with a Vite example; the default
  font imported through its `exports` subpath.
- Demo: fonts move from `public/` into `src/` and are imported; the
  comment goes.
