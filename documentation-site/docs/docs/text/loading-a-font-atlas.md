---
sidebar_position: 2
---

# Loading a Font Atlas

[`FontAtlasCache`](/Forge/docs/api/classes/FontAtlasCache) loads a
generated atlas's metrics JSON and PNG image into a
[`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas). Pass
[`getOrLoad`](/Forge/docs/api/classes/FontAtlasCache#getorload) the URL of
each file:

```ts
import { FontAtlasCache } from '@forge-game-engine/forge/text';

const fontAtlasCache = new FontAtlasCache(renderContext);
const fontAtlas = await fontAtlasCache.getOrLoad({
  metricsUrl: 'assets/fonts/my-font.json',
  imageUrl: 'assets/fonts/my-font.png',
});
```

The two URLs are independent: the image doesn't have to be in the same
directory as the JSON, or keep its original file name.

The cache loads the image through the render context's
[`textureCache`](../rendering/textures.md#loading-a-texture-from-an-image-file)
into a linear-filtered texture, `fontAtlas.texture`. The texture cache owns
that texture, so don't update or dispose it.

`getOrLoad` rejects if either file fails to load, if the JSON isn't a
supported atlas, or if the image's size doesn't match the JSON's
`atlasSize`.

:::caution
Load the JSON and PNG from the same generator run. Two atlases generated
at the same texture size pass the size check, and text drawn from a
mismatched pair shows the wrong glyphs.
:::

## Importing atlases through a bundler

Bundlers rename the files they emit (`my-font.png` becomes something like
`my-font-3f2a9c.png`), so import both files and pass the URLs the bundler
gives you instead of writing paths by hand.

With Vite, import the PNG directly and the JSON with `?url`, which gives
its URL instead of its parsed contents:

```ts
import { FontAtlasCache } from '@forge-game-engine/forge/text';
import myFontMetricsUrl from './fonts/my-font.json?url';
import myFontImageUrl from './fonts/my-font.png';

const fontAtlasCache = new FontAtlasCache(renderContext);
const fontAtlas = await fontAtlasCache.getOrLoad({
  metricsUrl: myFontMetricsUrl,
  imageUrl: myFontImageUrl,
});
```

With webpack 5, use `new URL(path, import.meta.url)` for both files. The
path must be a string literal for webpack to find the file:

```ts
const fontAtlas = await fontAtlasCache.getOrLoad({
  metricsUrl: new URL('./fonts/my-font.json', import.meta.url).href,
  imageUrl: new URL('./fonts/my-font.png', import.meta.url).href,
});
```

:::caution
If your webpack config runs `file-loader` or `url-loader` on images
(Docusaurus does), those loaders also process `new URL` image requests, and
the emitted `.png` contains JavaScript instead of the image, so it fails to
load. Import the PNG instead (`import myFontImageUrl from
'./fonts/my-font.png'`) and keep `new URL` for the JSON.
:::

The package's default font is imported the same way, from its
`fonts/default` exports (see [Text](./index.md#the-default-font)).

## Getting a loaded atlas

The cache is keyed by `metricsUrl`. Calling `getOrLoad` again with the same
`metricsUrl` returns the same `FontAtlas`, and calls made while it's still
loading share that load, so each file is fetched once.
[`get(metricsUrl)`](/Forge/docs/api/classes/FontAtlasCache#get) returns an
atlas that has finished loading, and throws for one that hasn't.

```ts
const fontAtlas = fontAtlasCache.get('assets/fonts/my-font.json');
```

Calling `getOrLoad` with a `metricsUrl` that was already requested with a
different `imageUrl` rejects.

## Reading glyph metrics

`fontAtlas.data.glyphs` is a `Map` of
[`GlyphMetrics`](/Forge/docs/api/interfaces/GlyphMetrics) keyed by Unicode
code point:

```ts
const glyph = fontAtlas.data.glyphs.get(0x41); // 'A'
```

- `advance`, `planeBounds` and the font-level `fontAtlas.data.metrics`
  (`lineHeight`, `ascender`, `descender`, `capHeight`) are in **em
  units**: multiply them by the text's `size` to get world units.
  `planeBounds` is Y-up, relative to the glyph's origin on the baseline.
- `planeBounds` includes the distance field's padding around the glyph's
  ink (half of `distanceRange`, in atlas pixels), which outlines and
  shadows draw into. `ascender` and `descender` are measured from those
  padded bounds; `capHeight` is measured on a flat capital (such as "H")
  without the padding.
- `atlasBounds` is the glyph's rectangle in the texture, normalized from
  `0` to `1`.
- `planeBounds` and `atlasBounds` are `null` for a glyph with no visible
  ink, such as space.
- `glyphs.get` returns `undefined` for a code point that isn't in the
  atlas's charset.

## Reading kerning

`fontAtlas.data.kerning` is a `Map` of kerning adjustments, in em units,
keyed by
[`getKerningPairKey(leftCodePoint, rightCodePoint)`](/Forge/docs/api/functions/getKerningPairKey).
A pair with no entry kerns by `0`:

```ts
import { getKerningPairKey } from '@forge-game-engine/forge/text';

const kerning = fontAtlas.data.kerning.get(getKerningPairKey(0x41, 0x56)) ?? 0; // 'A', 'V'
```
