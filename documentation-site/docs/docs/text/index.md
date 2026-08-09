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

```bash
npm install --save-dev msdf-bmfont-xml
npx forge-generate-font-atlas --font my-font.ttf --charset ascii --out assets/fonts/my-font
```

```ts
import { FontAtlasCache } from '@forge-game-engine/forge/text';

const fontAtlasCache = new FontAtlasCache();
const fontAtlas = await fontAtlasCache.getOrLoad('assets/fonts/my-font.json');

console.log(fontAtlas.data.glyphs.get('A'.codePointAt(0)!));
```
