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

:::info
This module currently covers **generating and loading** a font atlas only.
There is no `TextEcsComponent`, no text shaping, and no draw path yet, so
you can't render text on screen with it. If you need on-screen text today,
render it to a canvas texture yourself or overlay DOM on top of the game
canvas. This page will be updated once rendering lands.
:::

Two pieces make up the pipeline:

- An offline command, `forge-generate-font-atlas`, that reads a font file
  and writes out an atlas image plus a
  [`FontAtlasData`](/Forge/docs/api/interfaces/FontAtlasData)-shaped JSON
  file, sized to your game's actual `charset`.
- [`FontAtlasCache`](/Forge/docs/api/classes/FontAtlasCache), which loads
  that JSON/image pair at runtime into a
  [`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas), following the same
  [`AssetCache`](/Forge/docs/api/interfaces/AssetCache) contract as
  [`ImageCache`](/Forge/docs/api/classes/ImageCache) (see
  [Asset Loading](../asset-loading/index.md)).

Guides in this section:

- [Generating a Font Atlas](./generating-a-font-atlas.md): running
  `forge-generate-font-atlas` against your own font.
- [Loading a Font Atlas](./loading-a-font-atlas.md): using `FontAtlasCache`
  to load a generated atlas, and what the resulting metrics look like.

## Quick start

```bash
npm install --save-dev msdf-bmfont-xml
npx forge-generate-font-atlas --font my-font.ttf --charset ascii --out assets/fonts/my-font
```

```ts
import { FontAtlasCache } from '@forge-game-engine/forge/text';

const fontAtlasCache = new FontAtlasCache();
const fontAtlas = await fontAtlasCache.getOrLoad('assets/fonts/my-font');

console.log(fontAtlas.data.glyphs.get('A'.codePointAt(0)!));
```

See the two guides above for the details behind each step.
