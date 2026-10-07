---
sidebar_position: 7
---

# Layout Groups

A layout group positions and sizes the direct children of its element: in
a row, in a column or in a grid. A content size fitter sizes an element to
what's in it, and an aspect ratio fitter keeps an element's width and
height in proportion. They're components, and the systems that apply them
are registered by `registerUiSystems` and run every frame before layout.

<svg viewBox="0 0 640 220" role="img" aria-label="A horizontal layout group arranges its children left to right within its padded content box, with spacing between them. A vertical layout group arranges them top to bottom the same way." style={{width: '100%', height: 'auto', maxWidth: '640px'}}>
<defs>
<marker id="ui-layout-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ifm-color-emphasis-600)" />
</marker>
</defs>

{/* Horizontal group */}
<rect x="20" y="30" width="260" height="140" fill="none" stroke="var(--ifm-color-emphasis-500)" strokeWidth="1.5" strokeDasharray="6 4" />
<rect x="35" y="63" width="60" height="80" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<rect x="120" y="63" width="60" height="80" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<rect x="205" y="63" width="60" height="80" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<line x1="97" y1="103" x2="118" y2="103" stroke="var(--ifm-color-emphasis-600)" strokeWidth="1.5" markerStart="url(#ui-layout-arrow)" markerEnd="url(#ui-layout-arrow)" />
<text x="107" y="118" textAnchor="middle" fontSize="12" fill="var(--ifm-font-color-base)">spacing</text>
<line x1="22" y1="20" x2="35" y2="20" stroke="var(--ifm-color-emphasis-600)" strokeWidth="1.5" markerStart="url(#ui-layout-arrow)" markerEnd="url(#ui-layout-arrow)" />
<text x="28" y="12" textAnchor="middle" fontSize="11" fill="var(--ifm-font-color-base)">padding</text>
<text x="150" y="195" textAnchor="middle" fontSize="13" fill="var(--ifm-color-emphasis-700)">Horizontal group</text>

{/* Vertical group */}
<rect x="360" y="30" width="260" height="140" fill="none" stroke="var(--ifm-color-emphasis-500)" strokeWidth="1.5" strokeDasharray="6 4" />
<rect x="400" y="45" width="180" height="25" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<rect x="400" y="88" width="180" height="25" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<rect x="400" y="131" width="180" height="25" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<text x="490" y="195" textAnchor="middle" fontSize="13" fill="var(--ifm-color-emphasis-700)">Vertical group</text>
</svg>

_A horizontal group places its children left to right, and a vertical
group top to bottom, inside the group's rectangle minus its `padding`, with
`spacing` between children._

## Arranging children in a row or column

[`addHorizontalLayoutGroupComponent`](/Forge/docs/api/functions/addHorizontalLayoutGroupComponent)
and
[`addVerticalLayoutGroupComponent`](/Forge/docs/api/functions/addVerticalLayoutGroupComponent)
add a [`UiAxisLayoutGroupEcsComponent`](/Forge/docs/api/interfaces/UiAxisLayoutGroupEcsComponent)
to an element. Its children are arranged in the order they were parented:

```ts
import {
  addVerticalLayoutGroupComponent,
  createButton,
  createPanel,
  uiAlignments,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

const menu = createPanel(world, canvas, {
  anchor: UiAnchor.center({ x: 320, y: 400 }),
  sprite: panelSprite,
});

addVerticalLayoutGroupComponent(world, menu, {
  padding: { left: 24, right: 24, top: 24, bottom: 24 },
  spacing: 16,
  childAlignment: uiAlignments.topCenter,
});

for (const label of ['Play', 'Options', 'Quit']) {
  createButton(world, menu, {
    sprite: buttonSprite,
    label,
    fontAtlas,
    labelSize: 32,
    labelCategory: uiRenderCategory,
  });
}
```

The group writes each child's `x`, `y` and `anchoredPosition`, so the
child's own anchor isn't used, and its pivot is at its bottom-left corner.
By default the group also resizes its children: along the group's
direction, each child gets its preferred size plus a share of the space
left over, and across it, each child fills the group. `childControlWidth`,
`childControlHeight`, `childForceExpandWidth` and `childForceExpandHeight`
turn this off per axis. `childAlignment`, one of
[`uiAlignments`](/Forge/docs/api/variables/uiAlignments), places the
children in any space that's left.

## Setting a child's size in a group

A group measures a child by its rect transform's size: that's its
preferred size, its minimum is `0`, and it takes no share of leftover
space. When no child takes a share, the leftover space is shared evenly.
Add a
[`LayoutElementEcsComponent`](/Forge/docs/api/interfaces/LayoutElementEcsComponent)
to a child to set any of these:

```ts
import { addLayoutElementComponent } from '@forge-game-engine/forge/ui';

addLayoutElementComponent(world, nameLabel, { preferredWidth: 200 });
addLayoutElementComponent(world, nameField.entity, { flexibleWidth: 1 });
```

`flexibleWidth` and `flexibleHeight` are a child's share of the leftover
space, relative to its siblings'. `ignoreLayout: true` leaves a child out
of the group: it isn't measured or moved, and keeps its own anchor. A
label created with `sizeToText` is measured by its text (see
[Labels and Text](labels-and-text.md#sizing-a-label-to-its-text)).

## Arranging children in a grid

<svg viewBox="0 0 320 240" role="img" aria-label="A grid layout group arranges its children into a grid of cells within its padded content box, with spacing between cells on both axes." style={{width: '100%', height: 'auto', maxWidth: '320px'}}>
<rect x="20" y="20" width="280" height="200" fill="none" stroke="var(--ifm-color-emphasis-500)" strokeWidth="1.5" strokeDasharray="6 4" />
<rect x="35" y="35" width="119" height="48" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<rect x="166" y="35" width="119" height="48" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<rect x="35" y="95" width="119" height="48" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<rect x="166" y="95" width="119" height="48" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<rect x="35" y="155" width="119" height="48" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<rect x="166" y="155" width="119" height="48" fill="var(--ifm-color-primary)" fillOpacity="0.12" stroke="var(--ifm-color-primary)" strokeWidth="2" />
<text x="160" y="232" textAnchor="middle" fontSize="13" fill="var(--ifm-color-emphasis-700)">Grid group (fixedColumnCount: 2)</text>
</svg>

_A grid fills its cells from `startCorner` along `startAxis`, and wraps to
the next row or column after the column or row count._

[`addGridLayoutGroupComponent`](/Forge/docs/api/functions/addGridLayoutGroupComponent)
places each child in a cell of `cellSize`, and resizes it to the cell:

```ts
import { addGridLayoutGroupComponent } from '@forge-game-engine/forge/ui';

addGridLayoutGroupComponent(world, iconGrid, {
  cellSize: { x: 96, y: 96 },
  spacing: { x: 8, y: 8 },
  constraint: 'fixedColumnCount',
  constraintCount: 4,
});
```

`constraint` sets how many columns there are: as many as fit the group's
width (`'flexible'`, the default), or `constraintCount` columns
(`'fixedColumnCount'`) or rows (`'fixedRowCount'`). `childAlignment`
places the whole grid in the group's rectangle.

### Sizing grid columns to their content

With a fixed column or row count, `columnWidthMode: 'content'` makes each
column as wide as the widest preferred width among its cells, and
`rowHeightMode: 'content'` makes each row as tall as its tallest cell. A
form with a label column and a control column lines up its controls this
way:

```ts
addGridLayoutGroupComponent(world, settingsGrid, {
  constraint: 'fixedColumnCount',
  constraintCount: 2,
  columnWidthMode: 'content',
  cellSize: { x: 0, y: 40 },
  spacing: { x: 16, y: 12 },
  cellAlignment: uiAlignments.middleLeft,
});

createLabel(world, settingsGrid, {
  text: 'Music',
  fontAtlas,
  size: 20,
  category: uiRenderCategory,
  sizeToText: true,
});
createSlider(world, settingsGrid, { trackSprite, handleSprite });
```

On a `'content'` axis, a cell keeps its child's preferred size instead of
filling its column or row, and `cellAlignment` places it in the column or
row. `columnWidthMode` and `rowHeightMode` only accept `'content'` with a
fixed column or row count, which the type checker enforces.

## Nesting layout groups

A child that is itself a layout group is measured by its contents: its
children's sizes added up along its direction, the largest across it, plus
its padding and spacing. A horizontal row of buttons can be one child of a
vertical group.

:::note
Layout groups and fitters run before the layout system, so they arrange
children in the group's rectangle from the previous frame. When a group's
own size changes, for example because it was newly created or is nested in
another group, its children are placed in its new size one frame later.
:::

## Fitting an element to its content

[`addContentSizeFitterComponent`](/Forge/docs/api/functions/addContentSizeFitterComponent)
sets an element's size, every frame, to its measured content: the size a
layout group on the same element reports. Combined with a layout group,
the element grows and shrinks with its children:

```ts
import { addContentSizeFitterComponent } from '@forge-game-engine/forge/ui';

addVerticalLayoutGroupComponent(world, list, { spacing: 16 });
addContentSizeFitterComponent(world, list, { verticalFit: 'preferredSize' });
```

`horizontalFit` and `verticalFit` are `'unconstrained'` (the default,
which leaves the axis as it is), `'preferredSize'` or `'minSize'`. The
element needs point axes, since a fitter sets their sizes.

## Keeping an aspect ratio

[`addAspectRatioFitterComponent`](/Forge/docs/api/functions/addAspectRatioFitterComponent)
keeps an element's width divided by its height at `aspectRatio`:

```ts
import { addAspectRatioFitterComponent } from '@forge-game-engine/forge/ui';

addAspectRatioFitterComponent(world, thumbnail, {
  aspectMode: 'fitInParent',
  aspectRatio: 16 / 9,
});
```

`aspectMode` sets which size is kept:

- `'widthControlsHeight'` (the default): the height is set from the width.
- `'heightControlsWidth'`: the width is set from the height.
- `'fitInParent'`: the largest size that fits inside the parent's
  rectangle.
- `'envelopeParent'`: the smallest size that covers the parent's
  rectangle.

Like a content size fitter, it needs point axes.
