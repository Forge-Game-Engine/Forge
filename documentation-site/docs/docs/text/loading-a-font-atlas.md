---
sidebar_position: 2
---

# Loading a Font Atlas

[`FontAtlasCache`](/Forge/docs/api/classes/FontAtlasCache) loads a
generated atlas's metrics JSON and PNG image into a
[`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas). Pass it the URL of
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

The cache loads each image through the render context's `imageCache` and
uploads it to a linear-filtered [texture](../rendering/textures.md),
`fontAtlas.texture`. The cache owns that texture, so don't update or
dispose it.

## Importing atlases through a bundler

Bundlers rename the assets they emit (`my-font.png` becomes something like
`my-font-3f2a9c.png`), so import both files and pass the URLs the bundler
gives you rather than writing paths by hand.

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

If your webpack config runs `file-loader` or `url-loader` on images
(Docusaurus does), those loaders also process `new URL` image requests, and
the emitted `.png` contains JavaScript instead of the image, so it fails to
load. Import the PNG instead (`import myFontImageUrl from
'./fonts/my-font.png'`) and keep `new URL` for the JSON.

The engine's default font (see [Text](./index.md)'s Quick start) is
imported the same way, from the package's `fonts/default` exports:

```ts
import defaultFontMetricsUrl from '@forge-game-engine/forge/fonts/default/default.json?url';
import defaultFontImageUrl from '@forge-game-engine/forge/fonts/default/default.png';
```

## Gotchas

- **Keep the JSON and PNG from the same generator run.** `getOrLoad`
  rejects if the image's size doesn't match the JSON's `atlasSize`. Two
  different atlases generated at the same texture size still pass that
  check, and render garbled glyphs, so regenerate and replace both files
  together.
- **One image per metrics URL.** The cache is keyed by `metricsUrl`.
  Requesting the same `metricsUrl` with a different `imageUrl` rejects.
- **Requesting an atlas again doesn't reload it.** Repeated and concurrent
  `getOrLoad` calls for the same `metricsUrl` share one load, so the
  `Promise.all` pattern in the worked example below fetches each file once.

## Reading glyph metrics

`fontAtlas.data.glyphs` is a `Map<number, GlyphMetrics>` keyed by Unicode
code point:

```ts
const glyph = fontAtlas.data.glyphs.get('A'.codePointAt(0)!);
```

- `advance`, `planeBounds`, and the font-level `metrics` (`lineHeight`,
  `ascender`, `descender`, `capHeight`) are all in **em units**: multiply by
  your desired render size to get world/screen units. `planeBounds` is
  **Y-up**, relative to the glyph's baseline, matching the rest of Forge's
  Y-up conventions.
- `planeBounds` include the distance field's padding around the glyph's
  ink (half the `distanceRange`), because outlines and glows draw into
  it. `ascender` and `descender` are measured from those padded bounds, so
  they're safe outer bounds for everything a glyph renders. `capHeight` is
  measured on the letter itself (a flat capital like "H"), without the
  padding.
- `atlasBounds` is the glyph's texture rect, normalized `0` to `1`, with
  `top` closer to the top of the atlas image than `bottom`.
- Both `planeBounds` and `atlasBounds` are `null` for glyphs with no visible
  ink, like space, there's nothing to draw for them.
- A code point outside the atlas's generated charset simply isn't in the
  map; `glyphs.get(...)` returns `undefined` rather than throwing, so check
  for that if you're looking up characters you can't guarantee were
  included when the atlas was generated.

## Kerning lookups

`fontAtlas.data.kerning` is a `Map<string, number>` keyed by
[`getKerningPairKey(leftCodePoint, rightCodePoint)`](/Forge/docs/api/functions/getKerningPairKey).
A pair with no explicit entry kerns by `0`, so a lookup miss is the normal,
expected case for most glyph pairs, not an error condition:

```ts
import { getKerningPairKey } from '@forge-game-engine/forge/text';

const kern =
  fontAtlas.data.kerning.get(
    getKerningPairKey('A'.codePointAt(0)!, 'V'.codePointAt(0)!),
  ) ?? 0;
```

## Worked example

```ts
import { FontAtlasCache } from '@forge-game-engine/forge/text';

const fontAtlasCache = new FontAtlasCache(renderContext);

const [headingAtlas, bodyAtlas] = await Promise.all([
  fontAtlasCache.getOrLoad({
    metricsUrl: 'assets/fonts/heading.json',
    imageUrl: 'assets/fonts/heading.png',
  }),
  fontAtlasCache.getOrLoad({
    metricsUrl: 'assets/fonts/body.json',
    imageUrl: 'assets/fonts/body.png',
  }),
]);

const capitalA = bodyAtlas.data.glyphs.get('A'.codePointAt(0)!);

if (capitalA?.planeBounds) {
  const renderSize = 32;
  const glyphWidthInPixels =
    (capitalA.planeBounds.right - capitalA.planeBounds.left) * renderSize;
}
```
