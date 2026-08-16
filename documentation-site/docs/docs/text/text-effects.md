---
sidebar_position: 4
---

# Text Effects

[`TextEcsComponent`](/Forge/docs/api/interfaces/TextEcsComponent) supports an
outline and a soft shadow, both drawn by the same MSDF fragment shader that
draws the glyph fill, with no extra draw call:

```ts
import { addTextComponent } from '@forge-game-engine/forge/text';
import { Color } from '@forge-game-engine/forge/rendering';

addTextComponent(world, label, {
  text: 'Game Over',
  fontAtlas,
  size: 48,
  outlineColor: Color.black,
  outlineWidth: 2,
  shadowColor: new Color(0, 0, 0, 0.6),
  shadowOffset: { x: 2, y: -2 },
  shadowSoftness: 4,
});
```

## Screen-pixel-range units

`outlineWidth`, `shadowOffset`, and `shadowSoftness` are all measured in the
same unit as the anti-aliasing band around each glyph's edge: a fixed number
of screen pixels, not world units or a fraction of the font's em size. A
value of `2` draws an outline that's roughly 2 pixels thick on screen
regardless of `size`, camera zoom, or entity scale, the same way the glyph
edge itself stays exactly 1 pixel of anti-aliasing wide at any of those. This
is what keeps an outline or shadow looking consistent as the text is scaled,
rather than growing or shrinking along with the glyphs.

## Effect size is bounded by the atlas

`outlineWidth` and `shadowOffset` cannot grow arbitrarily large: the
distance field only encodes a graded distance up to a limited range around
each glyph's own edge (`FontAtlasData.distanceRange`, set when the atlas was
generated). Requesting a width or offset beyond that range does not keep
growing the effect - it caps at the widest/furthest value the atlas can
represent, so an oversized `outlineWidth` renders the thickest outline the
atlas supports rather than growing further or producing visual artifacts.

A font atlas generated with a small `--distance-range` (the default is `4`)
supports comparably small effect sizes, especially when text is rendered at
or below the atlas's own authored `--size`. Beyond capping the effect's
reach, a very small `--distance-range` also has less room to grade the
distance field smoothly, so an outline/shadow pushed close to the cap can
look coarse or blotchy rather than crisp - a symptom of running out of
graded precision, not a shader bug. Regenerate the atlas with a larger
`--distance-range` (see
[Generating a Font Atlas](./generating-a-font-atlas.md)) if a design calls
for a thick outline or a far-offset shadow; the [Text Rendering
demo](/Forge/demos/text)'s own atlas uses `--distance-range 32` for exactly
this reason.

A separate, sharper limit applies to very large effect sizes on glyphs with
an acute (sharp-angled) corner, such as `W`, `M`, `N`, `V`, `K`, `X`, `Y`,
`Z`, or `A`: the underlying MSDF generator can bake a visible seam artifact
into the graded region near that corner, at a distance from the edge that
depends on the corner's own geometry rather than on `--distance-range` -
regenerating the atlas at a larger `--distance-range`, a higher `--size`,
or a larger texture does not resolve it. This is invisible at the small
outline/shadow sizes most designs use, and only becomes visible once an
effect's reach approaches that corner-dependent distance. There's no atlas
setting that avoids it for an affected glyph; if a design needs a very
large effect (tens of screen pixels) specifically on text containing such
letters, test that combination directly against the target font and glyphs
rather than assuming the atlas budget alone determines the safe range.

## Disabling an effect

Both effects are off by default, and each is controlled independently:

- The outline is invisible while `outlineWidth` is `0` (the default),
  regardless of `outlineColor`.
- The shadow is invisible while `shadowColor`'s alpha is `0` (the default,
  `Color.transparent`), regardless of `shadowOffset`/`shadowSoftness`.

Setting `outlineWidth` back to `0`, or `shadowColor` back to a transparent
color, turns the corresponding effect off again.

## Batching

Outline and shadow parameters are per-instance data, not per-draw-call
uniforms. Two `TextEcsComponent`s sharing the same
[`FontAtlas`](/Forge/docs/api/interfaces/FontAtlas) still batch into a single
draw call even when one has an outline and the other doesn't, or when their
outline/shadow colors differ, the same way differently-tinted sprites
sharing a texture already batch together (see
[Batching](./rendering-text.md#batching)).
