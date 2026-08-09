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
