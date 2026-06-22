---
sidebar_position: 1
---

# Layout and Anchors

Every UI element has a [`UiTransformEcsComponent`](/Forge/docs/api/interfaces/UiTransformEcsComponent)
that positions it relative to its parent using anchors, not absolute screen
coordinates. `createUiLayoutEcsSystem` walks the UI hierarchy each frame and
resolves anchors into a screen-space `resolvedRect` and `worldMatrix`. This
is the same mental model as Unity's `RectTransform` anchoring, adapted to
Forge's ECS.

## Point anchors vs stretch anchors

`anchorMin` and `anchorMax` are normalised (0 to 1) positions within the
parent's rect. When they're equal, you have a **point anchor**: the element
has a fixed size and `offsetMin`/`offsetMax` describe its top-left and
bottom-right corners relative to that point. When they differ, you have a
**stretch anchor**: the element resizes with its parent, and the offsets
become pixel margins from the stretched edges.

```ts
import { Vector2 } from '@forge-game-engine/forge/math';

// Point anchor: a 100x50 box centred in the parent.
transform.anchorMin = new Vector2(0.5, 0.5);
transform.anchorMax = new Vector2(0.5, 0.5);
transform.offsetMin = new Vector2(-50, -25);
transform.offsetMax = new Vector2(50, 25);

// Stretch anchor: fills the parent with a 10px margin on every side.
transform.anchorMin = new Vector2(0, 0);
transform.anchorMax = new Vector2(1, 1);
transform.offsetMin = new Vector2(10, 10);
transform.offsetMax = new Vector2(-10, -10);
```

Use point anchors for fixed-size widgets (buttons, icons) positioned
relative to a corner, edge, or centre. Use stretch anchors for containers
that should track their parent's size (panels, scroll viewports, full-screen
overlays).

[`anchorPresets`](/Forge/docs/api/variables/anchorPresets) covers the nine
point positions (`topLeft`, `center`, `bottomRight`, ...) and the five
stretch modes (`stretchAll`, `topStretch`, ...) so you rarely need to write
raw `Vector2` anchor pairs by hand. Each preset also returns a matching
`pivot`, since rotation and scale are applied around the element's pivot, not
its top-left corner.

For point-anchored widgets you'll usually reach for
[`setUiRect`](/Forge/docs/api/functions/setUiRect) instead of setting
`offsetMin`/`offsetMax` directly: it takes a familiar `{ x, y, width,
height }` rect relative to the anchor point.

## Gotchas

- **`resolvedRect` and `worldMatrix` are read-only from user code.** They're
  recomputed by the layout system every frame from anchors, offsets, pivot,
  rotation, and scale. Writing to them directly works for exactly one frame,
  then the layout system overwrites your change. Change the anchor/offset
  fields instead.
- **`isStatic` entities still need `isDirty` set after you mutate them.**
  Setting `isStatic = true` tells the layout system to compute the rect once
  and skip it on every subsequent frame as long as its whole parent chain is
  also static, which is a meaningful win for HUD chrome that never moves. If
  you then change that element's anchor, offset, or parent at runtime, also
  set `isDirty = true` for one frame, otherwise your change is silently
  ignored until something else invalidates the cache. `createUiButton` does
  exactly this internally after repositioning its label.
- **The canvas root has no parent, so its rect comes from `width`/`height` on
  `UiCanvasEcsComponent`**, not from anchors. Resizing the canvas means
  changing those fields (typically via `createUiResizeObserver`) and setting
  `canvas.isDirty = true`, which the layout system consumes once per frame.
- **`UiCanvasScaleMode` values other than `'constant-pixel'` are not yet
  implemented.** `scale-with-width`, `scale-with-height`, and `match` are
  accepted by the type but currently behave identically to
  `constant-pixel` (no scaling). Don't rely on them for resolution-independent
  UI yet; size your elements in real pixels.
- **Flex layout (`UiFlexEcsComponent`) is an experimental spike, not a full
  flex-box implementation.** It only overrides a child's *position*
  (`resolvedRect.origin`), and its *cross-axis size* when `align: 'stretch'`.
  The child's main-axis size still comes from its own anchor/offset rect, so
  give flex children a fixed main-axis size with a point anchor and
  `offsetMax`; the flex system arranges them, it doesn't size them. Register
  `createUiFlexLayoutEcsSystem` with a higher registration order than
  `createUiLayoutEcsSystem` so it runs after and can override the anchor
  result.

## Resize handling

`createUiResizeObserver` wraps a `ResizeObserver` on the game container and
keeps `UiCanvasEcsComponent` in sync automatically:

```ts
import { createUiResizeObserver } from '@forge-game-engine/forge/ui';

const resizeObserver = createUiResizeObserver(container, canvasEntity, world);

// Tear down when the scene/world is destroyed:
resizeObserver.stop();
```

Because `ResizeObserver` already batches multiple DOM size changes within
the same animation frame into one callback, the layout system never sees
more than one dirty signal per frame, even during a rapid resize (e.g. a
user dragging the browser window edge). You don't need to debounce resize
handling yourself. Subscribe to `resizeObserver.onResize` if other systems
(a custom projection matrix, a minimap) need to react to the new size too.

## Common mistake

A panel that doesn't appear, or appears at `(0, 0)` with zero size, is
almost always a parent chain that's missing a `UiTransformEcsComponent` or a
`UiCanvasEcsComponent` somewhere above it; `resolveParentRect` falls back to
a zero-size rect at the origin when it can't find either on the parent.

```ts
// Wrong: panel's `parent` points at a plain entity with no transform/canvas.
const container = world.createEntity();
createUiPanel(world, { renderable, rect: {...}, parent: container });

// Right: give the container a transform too (e.g. via createUiPanel itself,
// or createUiCanvas if it's the root).
const container = createUiPanel(world, { renderable, rect: {...}, parent: canvasEntity });
createUiPanel(world, { renderable, rect: {...}, parent: container.entity });
```
