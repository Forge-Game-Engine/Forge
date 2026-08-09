---
sidebar_position: 2
---

# Loading a Font Atlas

[`FontAtlasCache`](/Forge/docs/api/classes/FontAtlasCache) loads a
generated atlas's JSON metrics and PNG texture into a
[`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas).

```ts
import { FontAtlasCache } from '@forge-game-engine/forge/text';

const fontAtlasCache = new FontAtlasCache();
const fontAtlas = await fontAtlasCache.getOrLoad('assets/fonts/my-font.json');
```

## Cache keys point at the JSON file

`getOrLoad('assets/fonts/my-font.json')` fetches that file, then loads
whatever image its `atlasImage` field names, resolved relative to the JSON
file itself (so the `.png` doesn't have to share the exact base name,
though `forge-generate-font-atlas` always names them to match).

## Reading glyph metrics

`fontAtlas.data.glyphs` is a `Map<number, GlyphMetrics>` keyed by Unicode
code point:

```ts
const glyph = fontAtlas.data.glyphs.get('A'.codePointAt(0)!);
```

- `advance`, `planeBounds`, and the font-level `metrics` (`lineHeight`,
  `ascender`, `descender`) are all in **em units**: multiply by your desired
  render size to get world/screen units. `planeBounds` is **Y-up**, relative
  to the glyph's baseline, matching the rest of Forge's Y-up conventions.
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

const fontAtlasCache = new FontAtlasCache();

const [headingAtlas, bodyAtlas] = await Promise.all([
  fontAtlasCache.getOrLoad('assets/fonts/heading.json'),
  fontAtlasCache.getOrLoad('assets/fonts/body.json'),
]);

const capitalA = bodyAtlas.data.glyphs.get('A'.codePointAt(0)!);

if (capitalA?.planeBounds) {
  const renderSize = 32;
  const glyphWidthInPixels =
    (capitalA.planeBounds.right - capitalA.planeBounds.left) * renderSize;
}
```
