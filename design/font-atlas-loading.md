# Design: Font Atlases Load From Two Explicit URLs

|                                       |                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                 |
| **Kind**                              | Defect                                                                                            |
| **Found in**                          | Galactic Journey demo: `src/ui/create-ui.ts` (fonts served from `public/` to avoid hashed names) |
| **Engine version at time of writing** | `0.25.8`                                                                                          |
| **Related**                           | [`sprite-textures.md`](./sprite-textures.md)                                                      |

## 0. Targeted modules

| Path                                               | Change   | Notes                                                                      |
| -------------------------------------------------- | -------- | -------------------------------------------------------------------------- |
| `src/text/font-atlas/font-atlas-cache.ts`          | Modified | `getOrLoad({ metricsUrl, imageUrl })`; no path resolution                  |
| `src/text/font-atlas/font-atlas-file-data.ts`, `font-atlas-data.ts`, `validate-font-atlas-data.ts` | Modified | `atlasImage` no longer part of the data |
| `scripts/generate-font-atlas.mjs`                  | Modified | Stops writing `atlasImage`                                                 |
| `documentation-site/docs/docs/text/loading-a-font-atlas.md`, demos | Modified | Both URLs; importing them through a bundler                |

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
slice, so a JSON URL with a query string or a different origin resolves
wrongly.

Web engines that load MSDF fonts take the image URL from the caller
(Babylon.js's `FontAsset` takes the definition and the texture URL
separately, and Three.js text libraries load the texture with the
regular texture loader). This design does the same: the caller passes
both URLs, which any bundler can produce.

---

## 2. Scope

### In scope

- `FontAtlasCache` taking both URLs.
- Dropping `atlasImage` from the loaded data and the generator's output.
- Docs: importing font atlases through a bundler.

### Out of scope

- **A single-file atlas format** (image embedded in the JSON). Larger
  downloads, and the two-file output works with every bundler once the
  loader stops guessing.
- **Loading fonts as `Texture`s.** That follows from
  [`sprite-textures.md`](./sprite-textures.md).

---

## 3. How established engines handle this

- **Babylon.js**: `new FontAsset(definitionJson, textureUrl)`.
- **Three.js** text libraries (`three-bmfont-text`, `troika`): the font
  definition and the atlas texture are loaded separately by the caller.
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

The cache is keyed by `metricsUrl`. The image is loaded from `imageUrl`
as given, through the image cache. Loading the same metrics with a
different image URL throws, since the cache would otherwise return
whichever came first.

With Vite, a game imports both files and passes the results:

```ts
import fontMetricsUrl from './fonts/my-font.json?url';
import fontImageUrl from './fonts/my-font.png';

const font = await fontAtlasCache.getOrLoad({
  metricsUrl: fontMetricsUrl,
  imageUrl: fontImageUrl,
});
```

`atlasImage` is removed from `FontAtlasData`, its validation and the
generator's output. Existing JSON files that still contain it load
normally; the field is ignored like any other unknown field.

`FontAtlasCache` no longer implements `AssetCache`, whose single-key
`load` doesn't fit two URLs. Nothing uses `AssetCache` polymorphically.

---

## 5. Phases

### Phase 1: Explicit URLs

| #   | Task                                                                                  | Size |
| --- | ------------------------------------------------------------------------------------- | ---- |
| 1.1 | `getOrLoad({ metricsUrl, imageUrl })`; key conflict check; `resolveRelativeToKey` deleted | S |
| 1.2 | `atlasImage` removed from data, validation and the generator                          | S    |
| 1.3 | Migrate docs demos and e2e scenes (39 references)                                     | S    |
| 1.4 | `text/loading-a-font-atlas.md` with a bundler example; changelog under `#### Changed`  | S    |

**Definition of done:** a font atlas imported through Vite loads in a
production build with hashed asset names.

---

## 6. Decision log

### DL-1: Always both URLs, not an optional image URL

**Options.** (a) Both URLs, always. (b) The image URL optional, falling
back to the JSON-relative name.

**Decision: (a).**

**Rationale.** (b) keeps the path that breaks under a bundler as the
default and adds a second way to load the same thing. Passing two URLs is
one extra line for a game that serves files unbundled.

---

## 7. Open questions

None.

---

## 8. Testing considerations

- Loads with unrelated URLs for metrics and image (different directories,
  query strings).
- Same metrics URL with a different image URL throws.
- JSON with and without `atlasImage` validates.

## 9. Documentation and demo follow-up

- `text/loading-a-font-atlas.md`: both URLs, with a Vite example.
- Demo: fonts move from `public/` into `src/` and are imported; the
  comment goes.
