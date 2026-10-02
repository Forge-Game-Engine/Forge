---
sidebar_position: 6
---

# Nine-Slice Sprites

A UI panel or button drawn as a single stretched sprite distorts its
corners the moment it's resized: a crisp rounded border turns into a soft,
blurry oval as the sprite grows past its source art's native size.
Nine-slicing (also called "9-patch") fixes this by cutting the sprite into
a 3x3 grid — a border inset from each edge — and only stretching (or
tiling) the four edges and the center, while the four corners are always
drawn at their original, fixed size. Configure it with
[`NineSliceOptions`](/Forge/docs/api/interfaces/NineSliceOptions) on a
[`SpriteEcsComponent`](/Forge/docs/api/interfaces/SpriteEcsComponent):

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { Vec2 } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  createImageSprite,
} from '@forge-game-engine/forge/rendering';

const panelSprite = createImageSprite(panelImage, renderContext, {
  pixelsPerUnit: 1,
  slices: { left: 12, right: 12, top: 12, bottom: 12 },
});

const panel = world.createEntity();
addPositionComponent(world, panel, { world: { x: 400, y: 300 } });
const panelSpriteComponent = addSpriteComponent(world, panel, panelSprite);

// Resize the panel later (e.g. to fit dynamic text) - the 12px corners
// stay crisp no matter how large the panel grows.
panelSpriteComponent.width = 320;
panelSpriteComponent.height = 200;
```

Nothing else changes: the attached sprite is still one
`SpriteEcsComponent`, with one `width`/`height` you resize like any other
sprite. The render system
detects `slices` and draws it as up to nine quads instead of one, entirely
transparently to the rest of the ECS (position, rotation, scale, flip, and
layer/depth sorting all work exactly as they do for a normal sprite).

## Choosing insets

`left`/`right`/`top`/`bottom` are measured in the same world units as the
sprite's `width`/`height`. For `createImageSprite`, that's the source
image's pixel size divided by `pixelsPerUnit` — so with `pixelsPerUnit: 1`
an inset of `12` covers 12 pixels of border art in the source texture (with
the default `pixelsPerUnit` of `100`, the same 12 pixels would be an inset
of `0.12`). Pick insets that cover exactly the rounded corner/border
artwork in your source image and no more: too small and the stretched
center creeps into the border art; too large and the fixed corners eat into
space that should stretch.

## Native size

`nativeWidth`/`nativeHeight` are the size, in those same units, that the
insets were authored against. They anchor _where_ the insets fall in the
texture: the left border samples `left / nativeWidth` of the texture,
however wide the sprite is currently drawn. When you omit them they're
captured once, from the sprite's size at the moment it's created by
`createImageSprite` (the imported texture's world size) or attached by
`addSpriteComponent` — never from its current, possibly resized size. So a
sprite resized afterwards, whether by your own code or every frame by a
layout system (as every [UI](../ui/index.md) element is), keeps sampling
the same border art.

Set them explicitly when that captured size isn't the size the insets were
authored against — for example if you resized the sprite (to fit a layout,
say) before attaching it, or if its insets are in different units from its
imported size (e.g. a UI sprite imported with the default
`pixelsPerUnit` of `100`, whose insets are in reference pixels). Getting
this wrong doesn't break geometry (corners still render at the fixed inset
size); it shifts which texture pixels land in the border vs. the center, so
corners look smeared or cropped.

## Stretch vs. tile

Each edge and the center independently default to `edgeMode: 'stretch'`
and `centerMode: 'stretch'`: the region's texture is scaled to fill the
available space, which is fine for a flat color or a soft gradient but
smears any repeating detail (a brick or wood-grain edge, a dashed border).
Set the relevant mode to `'tile'` instead to repeat that region's texture
at its native size:

```ts
createImageSprite(panelImage, renderContext, {
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

Tiling here means **round-repeat**, not a pixel-perfect crop: the number of
repeats is rounded to the nearest whole tile, and every tile is stretched
by a small, usually-imperceptible amount so the tiles fill the available
space evenly with no cropped partial tile at the seam. This trades
sub-pixel size accuracy for never showing a jarring half-tile at the edge
of a region — the same tradeoff CSS's `border-image-repeat: round` makes.
`nativeWidth`/`nativeHeight` matter more here than for `'stretch'`, since
they're also the reference size the repeat count is computed from: a
region repeats roughly once per native-size-worth of space, so a sprite
drawn at its native size tiles as a single, unrepeated region.

## Performance note

A sliced sprite draws as up to nine separate instances (fewer if any
inset is `0`, or more if a `'tile'` region needs several repeat tiles)
instead of one, so it costs proportionally more per-instance data than a
normal sprite. They still batch into the same instanced draw call as every
other sprite sharing the same `Renderable`, so this only shows up as more
instances in that batch, not extra draw calls — for the handful of panels
and buttons a typical UI needs, this is negligible. It's not a fit for
slicing thousands of sprites per frame (a particle system, say); use it for
UI chrome and other sparse, mostly-static elements.
