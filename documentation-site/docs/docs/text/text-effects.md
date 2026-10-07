---
sidebar_position: 4
---

# Text Effects

A [`TextEcsComponent`](/Forge/docs/api/interfaces/TextEcsComponent) can
draw an outline and a soft shadow or glow around its glyphs. Both are
computed from the same distance field the glyph's edge is drawn from, so
they need no extra texture. Both are off by default.

## Adding an outline

`outlineColor` and `outlineWidth` draw a band of color around the edge of
each glyph. An `outlineWidth` of `0` (the default) draws no outline.

```ts
import { Color } from '@forge-game-engine/forge/rendering';
import { addTextComponent } from '@forge-game-engine/forge/text';

addTextComponent(world, label, {
  text: 'Game Over',
  fontAtlas,
  size: 48,
  outlineColor: Color.black,
  outlineWidth: 2,
});
```

The outline surrounds the thickened edge of [bold](./rendering-text.md#bold-text)
glyphs.

## Adding a shadow or glow

`shadowColor`, `shadowOffset` and `shadowSoftness` draw a copy of each
glyph's shape behind it, moved by `shadowOffset` and faded out over
`shadowSoftness` from its edge. A `shadowColor` with an alpha of `0` (the
default) draws no shadow. An offset of `{ x: 0, y: 0 }` with a softness
above `0` draws a glow.

```ts
addTextComponent(world, label, {
  text: 'Game Over',
  fontAtlas,
  size: 48,
  shadowColor: new Color(0, 0, 0, 0.6),
  shadowOffset: { x: 1.5, y: -1.5 },
  shadowSoftness: 2,
});
```

## Effect sizes

`outlineWidth`, `shadowOffset` and `shadowSoftness` are in screen pixels
(CSS pixels), not world units. They don't change with the text's `size`,
a `ScaleEcsComponent` or the camera's zoom. On a display with a
[`pixelRatio`](/Forge/docs/api/classes/RenderContext#pixelratio) above `1`
they're multiplied by the ratio, so an effect has the same physical size
on every display.

## How effects are drawn with the fill

For each text entity, every glyph's outline and shadow are drawn before
any glyph's fill. The outline and shadow of one glyph can extend over the
neighboring glyphs and merge with their effects, but they're never drawn
over a glyph's fill. A text entity drawn later in the draw order is drawn
over the fill of an earlier one.

## Choosing a safe range

The distance field holds distances only up to half of the atlas's
[`distanceRange`](/Forge/docs/api/interfaces/FontAtlasData) (in atlas
pixels) from a glyph's edge. An effect can't reach further than that: a
larger `outlineWidth`, `shadowOffset` or `shadowSoftness` is drawn at the
largest size the atlas holds.

In screen pixels, that limit grows with the size the text is drawn at. It
is about `distanceRange × renderedEmPixels / (2 × atlasEmPixels) - 0.5`,
where `renderedEmPixels` is the height of the text's em on screen and
`atlasEmPixels` is the `--size` the atlas was generated at. For an atlas
generated with the default `--size 42 --distance-range 4`, text drawn at
42 screen pixels per em has an effect limit of about 1.5 screen pixels,
and smaller text less. The package's default font atlas is generated at
`--size 42` with a `distanceRange` of `16`, so its effects reach about four
times as far. To draw wider effects, generate the atlas with a
larger `--distance-range` (see
[Generating a Font Atlas](./generating-a-font-atlas.md)).

A bold glyph's thickened edge uses part of the same limit, so its outline
and shadow can reach less far than a regular glyph's.

:::caution
Wide outlines and shadows can fill the enclosed spaces of letters such as
`o`, `e` and `B`, and show artifacts near sharp corners of letters such as
`W`, `M` and `A`. How much depends on the font. Check the characters your
text uses at the effect sizes you choose.
:::

## Removing an effect

Set `outlineWidth` to `0` to remove the outline, and set `shadowColor` to a
color with an alpha of `0` to remove the shadow. The render system reads
these fields every frame.
