---
sidebar_position: 2
---

# Anchors and Layout

Every UI element - including a canvas's own root entity - has a
[`RectTransformEcsComponent`](/Forge/docs/api/type-aliases/RectTransformEcsComponent).
`createUiLayoutEcsSystem` resolves it against its parent's rect once per
frame (top-down, in hierarchy order) and writes the result to
`rectTransform.rect`, the entity's `PositionEcsComponent.local` (so the
existing `createTransformEcsSystem` composes the right
`position.world`), and - for elements with a `SpriteEcsComponent` - the
sprite's `width`/`height`/`pivot`.

Two fields, `x` and `y`, drive resolution - one per axis, each a
[`UiAxis`](/Forge/docs/api/type-aliases/UiAxis):

- A **point axis** (`UiAxis.point`) anchors to a single normalized position
  within the parent's rect on that axis, `0` its low edge and `1` its high
  edge. It keeps its own literal `size` and moves with the anchor.
- A **stretch axis** (`UiAxis.stretch`) anchors to a normalized
  `[anchorMin, anchorMax]` span of the parent's rect on that axis instead. It
  resizes with the parent, with `margin` added to that span.

<svg viewBox="0 0 640 220" role="img" aria-label="A point-anchored element keeps a literal size and sits at a single anchor point on its parent's rect. A stretch-anchored element spans a range of its parent's rect, resizing with it, with a margin inset from that span." style={{width: '100%', height: 'auto', maxWidth: '640px'}}>
  <defs>
    <marker id="ui-anchor-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ifm-color-emphasis-600)" />
    </marker>
  </defs>

  {/* Point anchor */}
  <rect x="20" y="30" width="260" height="170" fill="none" stroke="var(--ifm-color-emphasis-500)" strokeWidth="1.5" strokeDasharray="6 4" />
  <rect x="170" y="30" width="110" height="60" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
  <circle cx="280" cy="30" r="4" fill="var(--ifm-color-primary)" />
  <text x="276" y="20" textAnchor="end" fontSize="13" fill="var(--ifm-font-color-base)">anchor (1, 1)</text>
  <text x="225" y="64" textAnchor="middle" fontSize="13" fill="var(--ifm-font-color-base)">size</text>
  <text x="150" y="215" textAnchor="middle" fontSize="13" fill="var(--ifm-color-emphasis-700)">Point axis</text>

  {/* Stretch anchor */}
  <rect x="360" y="30" width="260" height="170" fill="none" stroke="var(--ifm-color-emphasis-500)" strokeWidth="1.5" strokeDasharray="6 4" />
  <rect x="380" y="30" width="220" height="50" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
  <line x1="362" y1="55" x2="378" y2="55" stroke="var(--ifm-color-emphasis-600)" strokeWidth="1.5" markerStart="url(#ui-anchor-arrow)" markerEnd="url(#ui-anchor-arrow)" />
  <line x1="602" y1="55" x2="618" y2="55" stroke="var(--ifm-color-emphasis-600)" strokeWidth="1.5" markerStart="url(#ui-anchor-arrow)" markerEnd="url(#ui-anchor-arrow)" />
  <text x="370" y="45" textAnchor="middle" fontSize="12" fill="var(--ifm-font-color-base)">margin</text>
  <text x="610" y="45" textAnchor="middle" fontSize="12" fill="var(--ifm-font-color-base)">margin</text>
  <text x="490" y="64" textAnchor="middle" fontSize="13" fill="var(--ifm-font-color-base)">spans anchorMin..anchorMax</text>
  <text x="490" y="215" textAnchor="middle" fontSize="13" fill="var(--ifm-color-emphasis-700)">Stretch axis</text>
</svg>

_A point axis (left) keeps a literal size at a single anchor point - here
`(1, 1)`, the parent's top-right corner, matching `UiAnchor.topRight`. A
stretch axis (right) spans a range of the parent's rect instead - here the
full width, matching `UiAnchor.stretchTop` - resizing with the parent, with
`margin` inset from that span._

Both kinds also carry a `pivot` - the point within the element's own extent
on that axis that sits at the anchor (and that sprites/text position
around) - and the component separately has an **`anchoredPosition`**, an
`{x, y}` offset from the anchor, in reference pixels, that applies
regardless of either axis's kind.

Splitting `size` and `margin` into different fields, gated by which kind of
axis they belong to, means a stretch axis's type simply has no `size`
field to set by mistake, and a point axis's has no `margin` field.

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
center (see [Labels and Text](./labels-and-text.md)). Spread the result into
`addRectTransformComponent`'s options, or into `createPanel`/`createLabel`'s
`anchor` option:

```ts
addRectTransformComponent(world, entity, {
  ...UiAnchor.stretchTop({ height: 64 }), // a 64-unit-tall bar spanning the full width
});
```

A HUD top bar and a corner-anchored panel both hold their layout correctly
across a resize (window resize, aspect ratio change) - `createUiLayoutEcsSystem`
does a full recompute every frame rather than tracking dirty state, so
there's no separate resize hook to wire up.

## Pixel-locking one element with `screenPixels`

Every `UiAxis`'s `size`/`margin` is in **reference pixels** by default,
scaling with the canvas's scale factor exactly like everything else - a
600-reference-pixel-wide sidebar covers the same *proportion* of the screen
at any resolution or aspect ratio. Sometimes that's the wrong call for one
specific element: a fixed-width nav rail or a HUD icon that should hold a
constant **on-screen** size instead of growing or shrinking as the window
resizes. Pass `sizeUnit`/`marginUnit: 'screenPixels'` to keep that one axis
in literal, unscaled device pixels, converted to reference pixels fresh
every frame from the owning canvas's live scale factor:

```ts
addRectTransformComponent(world, sidebar, {
  ...UiAnchor.stretchLeft({ width: 320, widthUnit: 'screenPixels' }),
});
```

This sidebar stays exactly 320 device pixels wide at any window size or
aspect ratio, even though the rest of the canvas keeps scaling normally with
`referenceResolution` (see [Responsive UI](./responsive-ui.md)). `UiAnchor`'s
edge-pinned band presets (`stretchLeft`/`stretchRight`/`stretchVertical` via
`widthUnit`,
`stretchTop`/`stretchBottom`/`stretchHorizontal`/`stretchHorizontalLeft`/`stretchTopLeft`/`stretchTopRight`
via `heightUnit`) accept this directly; for a raw `UiAxis.point`/`UiAxis.stretch`,
pass `sizeUnit`/`marginUnit` in its own options.

Only `size`/`margin` convert this way - `anchoredPosition` and font sizes
stay in reference pixels regardless, so a `screenPixels`-sized element's own
children/content aren't automatically pixel-locked too; give a child its own
stretch anchor (a percentage of its now-pixel-locked parent, not a fixed
`anchoredPosition` inset) if it needs to track that parent's actual size.
