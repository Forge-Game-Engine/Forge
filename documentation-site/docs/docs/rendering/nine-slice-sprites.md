---
sidebar_position: 4
---

# Nine-Slice Sprites

A nine-slice sprite is cut into a 3 by 3 grid by an inset from each edge.
When the sprite is resized, its four corners keep their size, its four
edges stretch or tile along their length, and its center stretches or tiles
in both directions, so a border drawn in the corners and edges keeps its
shape at any size. A sprite is sliced by its `slices`, a
[`NineSliceOptions`](/Forge/docs/api/interfaces/NineSliceOptions).

## Slicing a sprite

Pass `slices` to
[`createImageSprite`](/Forge/docs/api/functions/createImageSprite), and
resize the sprite by setting its `width` and `height`:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import {
  addSpriteComponent,
  createImageSprite,
  createTexture,
} from '@forge-game-engine/forge/rendering';

const panelTexture = createTexture(renderContext, panelImage);

const panelSprite = createImageSprite(panelTexture, {
  pixelsPerUnit: 1,
  slices: { left: 12, right: 12, top: 12, bottom: 12 },
});

const panel = world.createEntity();
addPositionComponent(world, panel);
const panelSpriteComponent = addSpriteComponent(world, panel, panelSprite);

panelSpriteComponent.width = 320;
panelSpriteComponent.height = 200;
```

The 12-unit corners are drawn at 12 by 12 at any `width` and `height`. A
sliced sprite is positioned, rotated, scaled, flipped and ordered the same
way as any other sprite.

:::note
The render system draws a sliced sprite as up to nine instances (fewer when
an inset is `0`, more when a region tiles), in the same instanced draw
call as the sprites batched with it (see [Batching](./sprites.md#batching)).
:::

## Choosing insets

`left`, `right`, `top` and `bottom` are in the same world units as the
sprite's `width` and `height`. For `createImageSprite`, that's the
texture's size in texels divided by `pixelsPerUnit`: with
`pixelsPerUnit: 1`, an inset of `12` covers 12 texels of the texture.

Set each inset to the width of the border art on that side. A smaller inset
stretches part of the border with the center, and a larger one keeps part of
the center at a fixed size.

## Native size

`nativeWidth` and `nativeHeight` are the size, in the insets' units, that
the insets were authored against. They set where the insets fall in the
texture: the left border samples `left / nativeWidth` of the texture,
however wide the sprite is drawn.

When they're omitted, `createImageSprite` sets them to the texture's world
size, and `addSpriteComponent` sets them to the sprite's `width` and
`height` when it's attached. They don't change when the sprite is resized
later, by game code or by a [UI](../ui/index.md) layout.

Set them when the insets were authored against a different size, for
example when the sprite was resized before it was attached, or when the
insets are in different units from the sprite's size. Wrong values move the
lines where the texture is cut, so border art shows stretched in the edges
or cut off in the corners.

## Stretching and tiling

`edgeMode` sets how the four edges fill their length, and `centerMode` how
the center fills the sprite. Both are `'stretch'` by default, which scales
the region's texture to fill it. `'tile'` repeats the region's texture
instead, for border art with a repeating pattern:

```ts
createImageSprite(panelTexture, {
  pixelsPerUnit: 1,
  slices: {
    left: 12,
    right: 12,
    top: 12,
    bottom: 12,
    edgeMode: 'tile',
    centerMode: 'tile',
  },
});
```

A tiled region repeats a whole number of times: the region's size divided
by its size at the native size, rounded to the nearest whole number, at
least `1`. Each tile is stretched to fill the region exactly, so no tile is
cut off. A sprite drawn at its native size draws each region once.
