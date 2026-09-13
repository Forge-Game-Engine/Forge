---
sidebar_position: 3
---

# Responsive UI

## Coordinate spaces and scale modes

UI world space uses **reference pixels**: author against a fixed
`referenceResolution` (`1920x1080` by default), and the same layout reads
correctly at any actual resolution. `CanvasEcsComponent.scaleMode`
controls how the canvas's root rect - and its camera's
`verticalWorldUnits` - responds to the destination's live size:

- `scaleWithScreenSize` (default) - height stays pinned to
  `referenceResolution.y`; width follows the destination's aspect ratio.
- `matchWidth` - width stays pinned to `referenceResolution.x`; height
  follows the aspect ratio instead.
- `constantPixelSize` - the root rect matches the destination's actual
  pixel size one-to-one (`referenceResolution` is ignored); UI elements
  keep a constant on-screen size at the cost of covering a different
  fraction of the screen on different displays.
- `fitReferenceResolution` - the root rect is always at least
  `referenceResolution` on *both* axes, whichever of `scaleWithScreenSize`'s
  or `matchWidth`'s height would be larger, letterboxing/pillarboxing the
  destination's excess space on whichever axis isn't the limiting one.
  Reach for this over the other two when a layout fills the full reference
  resolution edge to edge (content anchored out to all four corners, say) -
  `scaleWithScreenSize`/`matchWidth` each only protect *one* axis from
  shrinking below the reference size, so a destination aspect ratio far
  enough from `referenceResolution`'s own can crop or squash a layout that
  assumes it always has the full reference size to work with, on whichever
  axis that mode doesn't pin.

This only applies to `renderMode: 'screenSpace'` (the default) - a
world-space canvas has no "destination size" to scale against (see
[Creating a Canvas](./creating-a-canvas.md)).

For an individual element that should keep a constant **on-screen** size
regardless of `scaleMode`, see
[Pixel-locking one element with `screenPixels`](./anchors-and-layout.md#pixel-locking-one-element-with-screenpixels).

## Safe area

Mobile browsers report a notch, camera cutout, rounded corners, or home
indicator via the CSS `env(safe-area-inset-*)` values.
[`getSafeAreaInsets`](/Forge/docs/api/functions/getSafeAreaInsets) (from
`@forge-game-engine/forge/rendering`) reads them back into plain numbers;
pass it to `registerUiSystems` to keep any
[`UiSafeAreaEcsComponent`](/Forge/docs/api/type-aliases/UiSafeAreaEcsComponent)
element clear of them automatically:

```ts
import { getSafeAreaInsets } from '@forge-game-engine/forge/rendering';
import {
  addUiSafeAreaComponent,
  createUiCanvas,
  registerUiSystems,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

registerUiSystems(world, renderContext, time, { getSafeAreaInsets });

const canvas = createUiCanvas(world, renderContext, {
  cullingMask: uiRenderCategory,
});

const hudRoot = createPanel(world, canvas, {
  anchor: UiAnchor.stretchAll(),
  sprite: transparentSprite,
});

addUiSafeAreaComponent(world, hudRoot);
```

`addUiSafeAreaComponent` expects its entity to already be
`UiAnchor.stretchAll()`-anchored - `createUiSafeAreaEcsSystem` (registered
by `registerUiSystems` once `getSafeAreaInsets` is supplied) overwrites its
`x`/`y`/`anchoredPosition` every frame to shrink the full-stretch rect
inward from whichever edges actually need it, converted from CSS pixels
into that canvas's own UI world units. Set a field (`top`/`right`/`bottom`/
`left`) `false` to leave that specific edge flush with its parent
regardless of the device's insets - e.g. a bottom bar that intentionally
extends under a home indicator. A browser with no notch/cutout (or that
doesn't support `env()`) reports all zeroes, so this is always safe to
wire up unconditionally.
