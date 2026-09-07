---
sidebar_position: 9
---

# Safe Area

Mobile browsers report a notch, camera cutout, rounded corners, or home
indicator via the CSS `env(safe-area-inset-*)` values.
[`getSafeAreaInsets`](/Forge/docs/api/functions/getSafeAreaInsets) (from
`@forge-game-engine/forge/rendering`) reads them back into plain numbers;
pass it to `createUiCanvas` to keep any
[`UiSafeAreaEcsComponent`](/Forge/docs/api/type-aliases/UiSafeAreaEcsComponent)
element clear of them automatically:

```ts
import { getSafeAreaInsets } from '@forge-game-engine/forge/rendering';

const canvas = createUiCanvas(world, renderContext, time, {
  cullingMask: uiRenderCategory,
  getSafeAreaInsets, // only needs reading on the first createUiCanvas call
});

const hudRoot = createPanel(world, canvas, {
  anchor: UiAnchor.stretchAll(),
  sprite: transparentSprite,
});

addUiSafeAreaComponent(world, hudRoot);
```

`addUiSafeAreaComponent` expects its entity to already be
`UiAnchor.stretchAll()`-anchored - `createUiSafeAreaEcsSystem` (registered
automatically once `getSafeAreaInsets` is supplied) overwrites its
`x`/`y`/`anchoredPosition` every frame to shrink the full-stretch rect
inward from whichever edges actually need it, converted from CSS pixels
into that canvas's own UI world units. Set a field (`top`/`right`/`bottom`/
`left`) `false` to leave that specific edge flush with its parent
regardless of the device's insets - e.g. a bottom bar that intentionally
extends under a home indicator. A browser with no notch/cutout (or that
doesn't support `env()`) reports all zeroes, so this is always safe to
wire up unconditionally.
