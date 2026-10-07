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
  [`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas) (see
  [Loading a Font Atlas](./loading-a-font-atlas.md)).
- [`addTextComponent`](/Forge/docs/api/functions/addTextComponent) and
  [`createTextShapingEcsSystem`](/Forge/docs/api/functions/createTextShapingEcsSystem),
  which draw a string from a loaded `FontAtlas` through the render system
  (see [Rendering Text](./rendering-text.md)).

## Quick start

The engine ships a pre-generated default atlas (Liberation Sans, SIL Open
Font License 1.1) inside the `@forge-game-engine/forge` package, so you can
render text with zero font setup - no `.ttf`, no `forge-generate-font-atlas`
run. Import its two files through the package's `fonts/default` exports and
pass the URLs your bundler gives you (this is Vite; see
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

The font's attribution is in `assets/fonts/default/License.txt` in the
package.

When you need your own font (a different look, or characters the default
atlas's ASCII charset doesn't cover), generate one:

```bash
npm install --save-dev msdf-bmfont-xml
npx forge-generate-font-atlas --font my-font.ttf --charset ascii --out src/fonts/my-font
```

```ts
import myFontMetricsUrl from './fonts/my-font.json?url';
import myFontImageUrl from './fonts/my-font.png';

const fontAtlas = await fontAtlasCache.getOrLoad({
  metricsUrl: myFontMetricsUrl,
  imageUrl: myFontImageUrl,
});

console.log(fontAtlas.data.glyphs.get('A'.codePointAt(0)!));
```
