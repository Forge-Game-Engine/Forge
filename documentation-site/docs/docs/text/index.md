---
sidebar_position: 11
---

# Text

The `text` module draws strings from a **multi-channel signed distance field
(MSDF) font atlas**: a texture plus a metrics file that describes every
glyph's shape and spacing. The texture stores each glyph's distance to its
edge instead of a fixed raster of pixels, so text drawn from it has sharp
edges at any size and camera zoom.

The module has three parts:

- `forge-generate-font-atlas`, an offline command that reads a `.ttf` or
  `.otf` font file and writes an atlas image and a
  [`FontAtlasData`](/Forge/docs/api/interfaces/FontAtlasData) JSON file. See
  [Generating a Font Atlas](./generating-a-font-atlas.md).
- [`FontAtlasCache`](/Forge/docs/api/classes/FontAtlasCache), which loads
  that JSON and image pair at runtime into a
  [`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas). See
  [Loading a Font Atlas](./loading-a-font-atlas.md).
- [`addTextComponent`](/Forge/docs/api/functions/addTextComponent) and
  [`createTextShapingEcsSystem`](/Forge/docs/api/functions/createTextShapingEcsSystem),
  which lay out a string from a loaded `FontAtlas` and draw it through the
  render system. See [Rendering Text](./rendering-text.md) and
  [Text Effects](./text-effects.md).

## The default font

The `@forge-game-engine/forge` package includes a generated atlas of
Liberation Sans (SIL Open Font License 1.1) with the printable ASCII
characters. Import its two files through the package's `fonts/default`
exports and pass the URLs your bundler gives you to `FontAtlasCache` (this
example uses Vite; see
[Loading a Font Atlas](./loading-a-font-atlas.md#importing-atlases-through-a-bundler)
for webpack):

```ts
import defaultFontMetricsUrl from '@forge-game-engine/forge/fonts/default/default.json?url';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
import { FontAtlasCache } from '@forge-game-engine/forge/text';

const fontAtlasCache = new FontAtlasCache(renderContext);
const fontAtlas = await fontAtlasCache.getOrLoad({
  metricsUrl: defaultFontMetricsUrl,
  imageUrl: defaultFontImageUrl,
});
```

The font's license is in `assets/fonts/default/License.txt` in the package.
For another typeface, or for characters outside printable ASCII, generate
an atlas of your own (see
[Generating a Font Atlas](./generating-a-font-atlas.md)).
