---
sidebar_position: 1
---

# RectTransform

Every UI element - including a canvas's own root entity - has a
[`RectTransformEcsComponent`](/Forge/docs/api/type-aliases/RectTransformEcsComponent).
`createUiLayoutEcsSystem` resolves it against its parent's rect once per
frame (top-down, in hierarchy order) and writes the result to
`rectTransform.rect`, the entity's `PositionEcsComponent.local` (so the
existing `createTransformEcsSystem` composes the right
`position.world`), and - for elements with a `SpriteEcsComponent` - the
sprite's `width`/`height`/`pivot`.

## Anchors, pivots, and stretching

Two fields, `x` and `y`, drive resolution - one per axis, each a
[`UiAxis`](/Forge/docs/api/type-aliases/UiAxis):

- A **point axis** (`UiAxis.point`) anchors to a single normalized position
  within the parent's rect on that axis, `0` its low edge and `1` its high
  edge. It keeps its own literal `size` and moves with the anchor.
- A **stretch axis** (`UiAxis.stretch`) anchors to a normalized
  `[anchorMin, anchorMax]` span of the parent's rect on that axis instead. It
  resizes with the parent, with `margin` added to that span.

Both kinds also carry a `pivot` - the point within the element's own extent
on that axis that sits at the anchor (and that sprites/text position
around) - and the component separately has an **`anchoredPosition`**, an
`{x, y}` offset from the anchor, in reference pixels, that applies
regardless of either axis's kind.

Splitting `size` and `margin` into different fields, gated by which kind of
axis they belong to, means a stretch axis's type simply has no `size`
field to set by mistake, and a point axis's has no `margin` field - the
type checker rules out the mix-up that a single, do-everything field would
otherwise allow silently.

[`UiAnchor`](/Forge/docs/api/variables/UiAnchor) has factories for the
common cases, each producing an `{x, y}` pair of axes: the nine point
anchors (`topLeft`, `topCenter`, `topRight`, `middleLeft`, `center`,
`middleRight`, `bottomLeft`, `bottomCenter`, `bottomRight`) take a `size`
`Vector2`; edge-pinned bands (`stretchTop`, `stretchBottom`, `stretchLeft`,
`stretchRight` - the common "HUD bar" and "side panel" anchors) take a
`height`/`width` plus an optional `horizontalMargin`/`verticalMargin`;
center bands (`stretchHorizontal`, `stretchVertical`) take the same;
`stretchAll` takes a `margin` `Vector2`; and a few non-center-pivoted
variants - `stretchTopLeft`, `stretchHorizontalLeft`, and `stretchTopRight`
- take the same shape as their band counterparts, for when you specifically
want the rect's own local origin on a particular edge rather than the
center (see [Labels](./labels.md)). Spread the result into
`addRectTransformComponent`'s options, or into `createPanel`/`createLabel`'s
`anchor` option:

```ts
addRectTransformComponent(world, entity, {
  ...UiAnchor.stretchTop({ height: 64 }), // a 64-unit-tall bar spanning the full width
});
```

A HUD top bar and a corner-anchored panel that both hold their layout
correctly across a resize (window resize, aspect ratio change) is the
module's own definition of done for this phase - `createUiLayoutEcsSystem`
does a full recompute every frame rather than tracking dirty state, so
there's no separate resize hook to wire up.

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

Everything above describes `renderMode: 'screenSpace'` (the default) - see
[World-Space Canvases](./world-space-canvases.md) for the other mode.
