---
sidebar_position: 11
---

# Text

The `text` module turns a `.ttf`/`.otf` font into a **multi-channel signed
distance field (MSDF) atlas**: a small texture plus a metrics file that
describes every glyph's shape and spacing. An MSDF atlas stays crisp at any
render size (12px or 400px, zoomed in or out) without regenerating anything,
because the texture stores each glyph's distance-to-edge rather than a fixed
raster of pixels.

Three pieces make up the module:

- An offline command, `forge-generate-font-atlas`, that reads a font file
  and writes out an atlas image plus a
  [`FontAtlasData`](/Forge/docs/api/interfaces/FontAtlasData)-shaped JSON
  file, sized to your game's actual `charset`.
- [`FontAtlasCache`](/Forge/docs/api/classes/FontAtlasCache), which loads
  that JSON/image pair at runtime into a
  [`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas), following the same
  [`AssetCache`](/Forge/docs/api/interfaces/AssetCache) contract as the
  rest of the engine's asset loading (see
  [Asset Loading](../asset-loading/index.md)).
- [`addTextComponent`](/Forge/docs/api/functions/addTextComponent) and
  [`createTextShapingEcsSystem`](/Forge/docs/api/functions/createTextShapingEcsSystem),
  which draw a string from a loaded `FontAtlas` through the render system
  (see [Rendering Text](./rendering-text.md)).

## Quick start

The engine ships a pre-generated default atlas (Liberation Sans, SIL Open
Font License 1.1) at `assets/fonts/default/` (`default.json`, `default.png`,
and a `License.txt` with the font's attribution) inside the
`@forge-game-engine/forge` package itself, so you can render text with zero
font setup - no `.ttf`, no `forge-generate-font-atlas` run, nothing to
license or commit yourself. `FontAtlasCache.getOrLoad` just needs those
three files reachable at a URL, the same as any atlas you generate
yourself, so copy (or have your build script copy) them from
`node_modules/@forge-game-engine/forge/assets/fonts/default/` into your
project's own served assets directory - most bundlers don't serve
`node_modules` directly:

```ts
import { FontAtlasCache } from '@forge-game-engine/forge/text';

const fontAtlasCache = new FontAtlasCache();
const fontAtlas = await fontAtlasCache.getOrLoad('assets/fonts/default.json');
```

When you need your own font (a different look, or characters the default
atlas's ASCII charset doesn't cover), generate one:

```bash
npm install --save-dev msdf-bmfont-xml
npx forge-generate-font-atlas --font my-font.ttf --charset ascii --out assets/fonts/my-font
```

```ts
const fontAtlas = await fontAtlasCache.getOrLoad('assets/fonts/my-font.json');

console.log(fontAtlas.data.glyphs.get('A'.codePointAt(0)!));
```
