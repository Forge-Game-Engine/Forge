---
sidebar_position: 5
---

# Text Rendering

UI text renders through a signed-distance-field (SDF) shader rather than
rasterised bitmap glyphs: [`createUiText`](/Forge/docs/api/functions/createUiText)
shapes a string into positioned glyph quads with
[`shapeText`](/Forge/docs/api/functions/shapeText), and the GPU samples a
shared font atlas texture loaded by
[`loadFontAsset`](/Forge/docs/api/functions/loadFontAsset). This keeps text
crisp at any `fontSize` without re-rasterising or shipping multiple bitmap
sizes per font.

```ts
import { createUiText, loadFontAsset } from '@forge-game-engine/forge/ui';
import { Color } from '@forge-game-engine/forge/rendering';

const font = await loadFontAsset(
  renderContext,
  '/fonts/inter-regular.json',
  '/fonts/inter-regular.png',
);

createUiText(world, renderContext, {
  text: 'Score: 0',
  font,
  fontSize: 18,
  color: Color.white,
  rect: { x: 16, y: 16, width: 200, height: 24 },
  parent: canvasEntity,
});
```

## Generating a font atlas

Text rendering needs a font atlas (an image) and a metrics JSON file that
describes each glyph's position, size, and advance within that image, in
the BMFont layout. Generate both from a TTF/OTF font with the bundled
script:

```bash
npm run generate:font -- --font assets/fonts/Inter-Regular.ttf --output documentation-site/static/fonts --name inter-regular --type msdf
```

This produces `inter-regular.png` (the atlas) and `inter-regular.json` (the
metrics), which is exactly the asset pair the UI demo loads via
`loadFontAsset(renderContext, '/fonts/inter-regular.json', '/fonts/inter-regular.png')`.
Re-run the script whenever you change font, size, charset, or distance
field type, it always regenerates both files together so they stay in sync.

`--charset` defaults to ASCII 32 to 126 plus a handful of common
punctuation (ellipsis and curly quotes). If your UI displays characters
outside that set (accented letters, other scripts, extra symbols), pass
`--charset <path-to-txt-file>` listing every character you need; a
codepoint with no glyph in the atlas is silently skipped by `shapeText`
rather than rendered as a fallback glyph, so missing characters disappear
instead of erroring.

### SDF vs MSDF

`--type` controls how the distance field is encoded:

- `sdf` (single-channel) is cheaper to generate and sample, and works well
  for most body text and UI labels.
- `msdf` (multi-channel, the default) preserves sharp corners on letters
  like `M`, `W`, or serif typefaces noticeably better at small sizes and
  when heavily scaled up, at the cost of a slightly larger atlas.

Pick `msdf` unless you have a specific reason to use `sdf`; the cost
difference is in generation time and atlas size, not runtime rendering
performance, since `loadFontAsset` reads the `distanceField.fieldType`
field from the JSON and sets the `u_msdf` shader uniform automatically.
There's no need to recreate `Renderable`s by hand to switch between them.

## Layout options

[`ShapeTextOptions`](/Forge/docs/api/interfaces/ShapeTextOptions) (set via
`createUiText`'s options, or directly on `UiTextEcsComponent`) covers
alignment, wrapping, and overflow, but **not bold or italic as style flags**.
A "bold" or "italic" look comes from loading a separate font atlas generated
from the bold/italic TTF and swapping `font`, the same way you'd switch
between two font families.

- `align` (`'left' | 'center' | 'right'`) positions each line horizontally
  within `maxWidth`.
- `verticalAlign` (`'top' | 'middle' | 'bottom'`) positions the whole text
  block vertically within `maxHeight`.
- `wrap` (`'none' | 'word' | 'char'`) only has an effect when `maxWidth` is
  set; `'none'` (the default) never breaks a line except on an explicit
  `\n` in the string.
- `overflow` (`'visible' | 'clip' | 'ellipsis'`) controls what happens when
  shaped text exceeds the element's bounds.

```ts
createUiText(world, renderContext, {
  text: 'A long status message that should wrap and truncate gracefully.',
  font,
  fontSize: 16,
  align: 'left',
  verticalAlign: 'top',
  wrap: 'word',
  overflow: 'ellipsis',
  rect: { x: 0, y: 0, width: 220, height: 48 },
  parent: canvasEntity,
});
```

## Gotchas

- **`wrap` does nothing without `maxWidth`.** `ShapeTextOptions.maxWidth`
  defaults to `Infinity`; `createUiText` derives it from the element's
  `rect`/offset width, so as long as you give the text entity a real width
  (not a zero-size placeholder later overridden by a stretch anchor),
  word/char wrapping works as expected. A text element using a stretch
  anchor with no resolved width yet (the first frame) wraps as if
  `maxWidth` were unbounded until layout runs.
- **`overflow: 'ellipsis'` truncates by height first, then by width.** If
  the text has more lines than fit in `maxHeight`, the last visible line is
  truncated and gets the ellipsis; only if a single line still overflows
  `maxWidth` after that does horizontal truncation kick in. A one-line
  label with no `maxHeight` set never triggers the height-based path.
- **Mutating `text`, `font`, `fontSize`, or any layout field on
  `UiTextEcsComponent` requires setting `dirty = true`.** The shaped-glyph
  cache (`shapedCache`) is only recomputed when the text system sees
  `dirty`; widget factories like `createUiButton`'s `setLabel` already do
  this for you, but if you mutate `UiTextEcsComponent` directly, remember
  the flag or your change never appears.
- **Font assets are cached by the `(jsonUrl, atlasUrl)` pair**, and the
  underlying `Renderable` is cached per `FontAsset` by
  `createUiTextRenderable`. Calling `loadFontAsset` repeatedly with the
  same URLs is cheap (it returns the cached asset), and every text entity
  using that font shares one draw call automatically, you don't need to
  build the renderable yourself.
- **A codepoint missing from the atlas is skipped, not substituted.** There
  is no fallback glyph or tofu box; absent glyphs simply don't advance a
  visible quad (though `shapeText` still advances the cursor for kerning
  purposes where metrics exist). Regenerate the atlas with a wider
  `--charset` if you see gaps in rendered text.

## Common mistake

Loading a font per text entity instead of once and sharing it defeats both
the asset cache and draw-call batching:

```ts
// Wrong: re-fetches and re-parses the same JSON/atlas for every label.
for (const item of items) {
  const font = await loadFontAsset(renderContext, '/fonts/inter-regular.json', '/fonts/inter-regular.png');
  createUiText(world, renderContext, { text: item.name, font, rect: {...}, parent });
}

// Right: load once, reuse the resolved FontAsset.
const font = await loadFontAsset(renderContext, '/fonts/inter-regular.json', '/fonts/inter-regular.png');
for (const item of items) {
  createUiText(world, renderContext, { text: item.name, font, rect: {...}, parent });
}
```

`loadFontAsset` is cached internally so the repeated-call version above
doesn't actually re-fetch over the network after the first call, but it
still pays a `Promise`/cache-lookup cost per call and obscures that every
label shares one font; prefer loading fonts once during scene setup,
alongside the canvas and systems, the same way the [Quick Start](./index.md#quick-start)
example does.

See [Buttons](./buttons.md) for how `createUiButton` composes a text label
with a background panel, and [Default Styling](./default-styling.md) for
how `color`/`opacity` interact with per-state style overrides.
