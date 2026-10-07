---
sidebar_position: 2
---

# Anchors and Layout

Every UI element, including a canvas's root, has a
[`RectTransformEcsComponent`](/Forge/docs/api/type-aliases/RectTransformEcsComponent)
that places its rectangle relative to its parent's rectangle. Every frame,
the layout system resolves the elements of each canvas top-down, parents
before children, and writes:

- the element's `rect`, the resolved rectangle in its canvas's
  coordinates (reference pixels, Y-up);
- the entity's `position.local`, the offset of its pivot from its parent's
  pivot;
- the width, height and pivot of the element's sprite and mask, if it has
  them, so they cover the rectangle.

## Point and stretch axes

A rect transform's `x` and `y` are each a
[`UiAxis`](/Forge/docs/api/type-aliases/UiAxis), of one of two kinds:

- A **point axis** anchors to one position in the parent's rectangle on
  that axis: `0` is the parent's left or bottom edge and `1` its right or
  top edge. It has a `size`, and keeps that size whatever the parent's
  size.
- A **stretch axis** anchors to a span of the parent's rectangle, from
  `anchorMin` to `anchorMax`. Its size is the span's size plus its
  `margin`, so it resizes with the parent. A negative `margin` makes it
  smaller than the span.

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

_A point axis (left) keeps its size at one anchor point, here `(1, 1)`,
the parent's top-right corner (`UiAnchor.topRight`). A stretch axis (right)
spans part of the parent's rectangle, here its full width
(`UiAnchor.stretchTop`), with `margin` added to the span._

## Pivot and anchored position

Each axis also has a `pivot`: a position in the element's own rectangle,
from `0` to `1`, that is placed at the anchor. A point axis's pivot
defaults to its anchor, so an element anchored to the parent's top-right
corner has its own top-right corner there, and stays inside the parent. A
stretch axis's pivot defaults to `0.5`.

`anchoredPosition` moves the pivot away from the anchor, in reference
pixels, on both kinds of axis. The pivot is the entity's position: the
element's sprite is drawn around it to cover the rectangle, and a label's
text is placed from it (see [Labels and Text](labels-and-text.md)).

## Adding a rect transform

The element factories (`createPanel`, `createLabel`, `createButton`, ...)
add a rect transform and take its axes as their `anchor` option. To make
an element without a factory, for example an invisible container, give an
entity a position, a parent and a rect transform:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import {
  addRectTransformComponent,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

const topBar = world.createEntity();

addPositionComponent(world, topBar);
world.setParent(topBar, canvas);
addRectTransformComponent(world, topBar, UiAnchor.stretchTop({ height: 64 }));
```

[`addRectTransformComponent`](/Forge/docs/api/functions/addRectTransformComponent)
copies the axes it's given, so one anchor value can be used for many
elements.

## Anchor presets

[`UiAnchor`](/Forge/docs/api/variables/UiAnchor) has a factory for each
common anchor. Each returns an `x` and `y` axis pair:

- `topLeft`, `topCenter`, `topRight`, `middleLeft`, `center`,
  `middleRight`, `bottomLeft`, `bottomCenter` and `bottomRight` are point
  anchors on both axes, and take the element's size:
  `UiAnchor.bottomRight({ x: 200, y: 80 })`.
- `stretchTop`, `stretchHorizontal` and `stretchBottom` span the parent's
  width at its top, middle or bottom, and take a `height`.
  `stretchTopLeft`, `stretchHorizontalLeft` and `stretchTopRight` are the
  same bands with the pivot on the left or right edge instead of the
  center.
- `stretchLeft`, `stretchVertical` and `stretchRight` span the parent's
  height at its left, middle or right, and take a `width`.
- `stretchAll` fills the parent, and takes an optional margin for each
  axis.

For any other anchor, build the axes with `UiAxis.point(anchor, options)`
and `UiAxis.stretch({ min, max }, options)`:

```ts
import { UiAxis } from '@forge-game-engine/forge/ui';

const lowerThird = {
  x: UiAxis.stretch({ min: 0, max: 1 }, { margin: -40 }),
  y: UiAxis.stretch({ min: 0, max: 1 / 3 }),
};
```

## Moving and resizing an element

Change an element at runtime by writing its rect transform's `x`, `y` or
`anchoredPosition`. The layout system resolves every element from these
values every frame, so the change takes effect on the next layout pass,
and an element moves and resizes with its parent, including when the
screen is resized, without any code of its own. Read `rect` for the
element's resolved rectangle, but don't write it: the layout system
overwrites it every frame.

:::note
A [layout group](layout-groups.md) writes `x`, `y` and `anchoredPosition`
of the children it arranges, and a
[safe area](responsive-ui.md#keeping-elements-inside-the-safe-area)
element's are written by the safe area system, so your writes to them are
overwritten.
:::

## Sizing an element in screen pixels

A point axis's `size` and a stretch axis's `margin` are in reference
pixels, which [scale with the canvas](responsive-ui.md). To keep an
element the same size on screen whatever the canvas's scale, give the
value in CSS pixels with `sizeUnit: 'screenPixels'` (on `UiAxis.point`) or
`marginUnit: 'screenPixels'` (on `UiAxis.stretch`). The band presets take
`heightUnit` or `widthUnit` for their point axis:

```ts
const sidebar = createPanel(world, canvas, {
  anchor: UiAnchor.stretchLeft({ width: 320, widthUnit: 'screenPixels' }),
  sprite: sidebarSprite,
});
```

The value is converted to reference pixels every frame, from the current
scale of the canvas's camera. `anchoredPosition` and font sizes stay in
reference pixels, and the element's children aren't converted: anchor a
child with a stretch axis to make it follow its screen-pixel parent's
size.
