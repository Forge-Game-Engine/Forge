---
sidebar_position: 3
---

# Responsive UI

A screen-space canvas is laid out in **reference pixels**, against a
reference resolution. Its scale mode decides how many reference pixels the
screen holds, so one layout fits screens of any size and aspect ratio. A
safe area element keeps its contents clear of a phone's notch and rounded
corners.

## Reference resolution

`createUiCanvas` takes a `referenceResolution`, `1920` by `1080` by
default: the screen size the UI is designed for. Sizes, margins and
positions of elements are in reference pixels, and the layout system sizes
the canvas's root rectangle, and the height its camera shows, in reference
pixels every frame.

## Scale modes

`scaleMode` picks how the root rectangle follows the screen. The values are
in [`uiScaleModes`](/Forge/docs/api/variables/uiScaleModes):

```ts
import { createUiCanvas, uiScaleModes } from '@forge-game-engine/forge/ui';

const canvas = createUiCanvas(world, renderContext, {
  cullingMask: uiRenderCategory,
  referenceResolution: { x: 1280, y: 720 },
  scaleMode: uiScaleModes.matchWidth,
});
```

- `scaleWithScreenSize` (the default): the root rectangle is
  `referenceResolution.y` high, and its width follows the screen's aspect
  ratio.
- `matchWidth`: the root rectangle is `referenceResolution.x` wide, and its
  height follows the screen's aspect ratio.
- `fitReferenceResolution`: the root rectangle is at least
  `referenceResolution` on both axes, and larger on the axis where the
  screen's aspect ratio has more room. Use it when the whole reference
  resolution has to fit on screen, for example a layout with content
  anchored to all four corners.
- `constantPixelSize`: the root rectangle is the canvas's size in CSS
  pixels, so a reference pixel is a CSS pixel and `referenceResolution`
  isn't used. Elements keep their size on screen, and cover a different
  share of it on different screens.

Scale modes apply to screen-space canvases only. To keep one element the
same size on screen in any scale mode, see
[Sizing an element in screen pixels](anchors-and-layout.md#sizing-an-element-in-screen-pixels).

## Keeping elements inside the safe area

A phone browser reports the area covered by a notch, a camera cutout,
rounded corners or a home indicator as safe-area insets.
[`getSafeAreaInsets`](/Forge/docs/api/functions/getSafeAreaInsets) reads
them. Pass it to `registerUiSystems`, and add a
[`UiSafeAreaEcsComponent`](/Forge/docs/api/type-aliases/UiSafeAreaEcsComponent)
to an element:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { getSafeAreaInsets } from '@forge-game-engine/forge/rendering';
import {
  addRectTransformComponent,
  addUiSafeAreaComponent,
  registerUiSystems,
} from '@forge-game-engine/forge/ui';

registerUiSystems(world, renderContext, time, { getSafeAreaInsets });

const safeArea = world.createEntity();

addPositionComponent(world, safeArea);
world.setParent(safeArea, canvas);
addRectTransformComponent(world, safeArea);
addUiSafeAreaComponent(world, safeArea);
```

Every frame, the safe area system sets the element's anchors so that it
fills its parent minus the insets, converted from CSS pixels to reference
pixels. Parent the HUD's elements to it to keep them inside the safe area.
Set `top`, `right`, `bottom` or `left` to `false` to leave that edge of the
element at its parent's edge, for example a bottom bar that extends under a
home indicator. A browser with no insets reports `0` for every edge.
