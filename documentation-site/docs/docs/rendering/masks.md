---
sidebar_position: 5
---

# Masks

A [`MaskEcsComponent`](/Forge/docs/api/interfaces/MaskEcsComponent) clips
the sprites and text of its entity and of every descendant to a rect. Its
shape shows the whole rect, part of it from one edge, or a sector around
its center, so a mask can crop a scrolling list, fill a bar or drain a
ring without resizing the art it clips.

## Mask shapes

A mask's `shape` is one of three kinds:

- `'rect'` shows everything inside the rect.
- `'linear'` shows `amount` (`0` to `1`) of the rect, measured from the
  `origin` edge: `'left'`, `'right'`, `'bottom'` or `'top'`.
- `'radial'` shows the sector from `startAngle` through
  `startAngle + sweep * amount` around the rect's center. Angles are in
  radians, `0` points along `+X` and a positive angle turns
  counter-clockwise (see [angles](../math/angles-and-rotation.md)). A
  negative `sweep` turns clockwise, and a `sweep` less than a full turn
  (`2 * Math.PI`) gives an arc.

Edges are anti-aliased.

## Adding a mask

[`addMaskComponent`](/Forge/docs/api/functions/addMaskComponent) attaches a
mask with a `width` and `height` in world units. The rect is placed like a
sprite's quad: `pivot` is the point of the rect at the entity's position,
and the entity's world rotation, scale and flip turn, scale and mirror it.
Without a `shape`, the mask is a `'rect'` mask.

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { addMaskComponent } from '@forge-game-engine/forge/rendering';

const viewport = world.createEntity();

addPositionComponent(world, viewport, { local: { x: 0, y: 0 } });
addMaskComponent(world, viewport, { width: 200, height: 120 });

world.setParent(listItem, viewport);
```

Every sprite and text on `viewport` and its descendants draws only inside
the 200 by 120 rect. A mask's entity needs a position.

## Revealing part of a sprite

A linear or radial mask on the same entity as a sprite reveals part of
that sprite, and the sprite keeps its size. Change `shape.amount` to fill
or drain it:

```ts
const healthBarMask = addMaskComponent(world, healthBar, {
  width: healthBarSprite.width,
  height: healthBarSprite.height,
  shape: { kind: 'linear', origin: 'left', amount: 1 },
});

// Later, when the health changes:
if (healthBarMask.shape.kind === 'linear') {
  healthBarMask.shape.amount = health / maxHealth;
}
```

A [nine-slice sprite](./nine-slice-sprites.md) revealed this way keeps its
end caps at their full size; the moving edge is a straight cut.

A radial mask turns with its entity, and measures its angles in the rect's
own units, so a non-square rect keeps the angles it was authored with:

```ts
addMaskComponent(world, cooldownRing, {
  width: ringSprite.width,
  height: ringSprite.height,
  shape: {
    kind: 'radial',
    startAngle: Math.PI / 2,
    sweep: -2 * Math.PI,
    amount: 0.25,
  },
});
```

This ring shows the quarter clockwise from its top.

## Nesting masks

Content under several masks is clipped by all of them. Rect masks
intersect, and content can be under any number of them. Content can be
under at most one linear or radial mask: the render system throws when it
finds two on one entity's chain of ancestors.

:::note
A rect mask clips to its rect's world-space bounds, which is the rect
itself unless the mask's entity is rotated. A linear mask at `amount: 1`
clips to the rotated rect.
:::

## Masks in custom shaders

The masks are applied in the sprite and text fragment shaders. A sprite
material's own fragment shader (see
[Drawing sprites with a custom shader](./sprites.md#drawing-sprites-with-a-custom-shader))
includes `spriteMask` and multiplies its output alpha by
`spriteMaskCoverage()`; `createSpriteMaterial` throws for one that
doesn't.

## Removing a mask

Remove the `MaskEcsComponent` with `world.removeComponent(entity, maskId)`.
The entity's content and its descendants' content draw without clipping from the
next frame.
