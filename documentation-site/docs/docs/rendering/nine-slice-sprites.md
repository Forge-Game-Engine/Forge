---
sidebar_position: 5
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
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  createImageSprite,
  spriteId,
} from '@forge-game-engine/forge/rendering';

const panelSprite = createImageSprite(panelImage, renderContext, 0, {
  slices: { left: 12, right: 12, top: 12, bottom: 12 },
});

const panel = world.createEntity();
addPositionComponent(world, panel, { world: new Vector2(400, 300) });
world.addComponent(panel, spriteId, panelSprite);

// Resize the panel later (e.g. to fit dynamic text) - the 12px corners
// stay crisp no matter how large the panel grows.
panelSprite.width = 320;
panelSprite.height = 200;
```

Nothing else changes: `panelSprite` is still one `SpriteEcsComponent`, with
one `width`/`height` you resize like any other sprite. The render system
detects `slices` and draws it as up to nine quads instead of one, entirely
transparently to the rest of the ECS (position, rotation, scale, flip, and
layer/depth sorting all work exactly as they do for a normal sprite).

## Choosing insets

`left`/`right`/`top`/`bottom` are measured in the same world units as the
sprite's `width`/`height` (which, for `createImageSprite`, default to the
source image's pixel size — so for a not-yet-resized sprite, an inset of `12`
matches 12 pixels of border art in the source texture). Pick insets that
cover exactly the rounded corner/border artwork in your source image and no
more: too small and the stretched center creeps into the border art; too
large and the fixed corners eat into space that should stretch.

If the sprite is already a non-default size when you configure slicing
(for example you sized it to fit a layout before slicing it), set
`nativeWidth`/`nativeHeight` to the size the border art was authored at.
These default to the sprite's current `width`/`height`, so a sprite that's
never resized after slicing looks identical to before — but they anchor
_where_ the insets fall in the texture's UV space, independent of the
sprite's current, possibly-stretched size. Getting this wrong doesn't
break geometry (corners still render at the fixed inset size); it only
shifts which texture pixels land in the border vs. the center.

## Stretch vs. tile

Each edge and the center independently default to `edgeMode: 'stretch'`
and `centerMode: 'stretch'`: the region's texture is scaled to fill the
available space, which is fine for a flat color or a soft gradient but
smears any repeating detail (a brick or wood-grain edge, a dashed border).
Set the relevant mode to `'tile'` instead to repeat that region's texture
at its native size:

```ts
createImageSprite(panelImage, renderContext, 0, {
  slices: {
    left: 12,
    right: 12,
    top: 12,
    bottom: 12,
    edgeMode: 'tile',
    centerMode: 'tile',
    nativeWidth: panelImage.width,
    nativeHeight: panelImage.height,
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
they're also the reference size the repeat count is computed from: without
them (left at their width/height defaults), a sprite tiles as a single,
unrepeated region until you resize it.

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
