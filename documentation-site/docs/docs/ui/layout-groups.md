---
sidebar_position: 6
---

# Layout Groups

Every element seen so far is positioned manually - an explicit anchor and
`anchoredPosition`. A layout group instead arranges its own direct children
automatically, recomputing every frame just like `createUiLayoutEcsSystem`
itself does:

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

// createUiLayoutGroupEcsSystem (registered automatically by createUiCanvas)
// resizes and stacks every direct child added below - no anchor of its own
// needed.
createButton(world, menu, { sprite: buttonSprite, label: 'Play', fontAtlas });
createButton(world, menu, {
  sprite: buttonSprite,
  label: 'Options',
  fontAtlas,
});
createButton(world, menu, { sprite: buttonSprite, label: 'Quit', fontAtlas });
```

[`addHorizontalLayoutGroupComponent`](/Forge/docs/api/functions/addHorizontalLayoutGroupComponent)/
[`addVerticalLayoutGroupComponent`](/Forge/docs/api/functions/addVerticalLayoutGroupComponent)
arrange direct children left-to-right/top-to-bottom, resizing each one (per
`childControlWidth`/`childControlHeight`) to its measured preferred size -
its own `RectTransformEcsComponent`'s current size on each axis, unless
overridden by a
[`LayoutElementEcsComponent`](/Forge/docs/api/interfaces/LayoutElementEcsComponent)
(`minWidth`/`minHeight`/`preferredWidth`/`preferredHeight`/`flexibleWidth`/
`flexibleHeight`) - plus, by default (`childForceExpandWidth`/
`childForceExpandHeight`), stretching every child to fill the whole cross
axis and distributing any leftover main-axis space, weighted by
`flexibleWidth`/`flexibleHeight` (or evenly, with none set). `childAlignment`
(see [`uiAlignments`](/Forge/docs/api/variables/uiAlignments), named the same
way as `UiAnchor`'s nine point presets) places the child block within any
leftover main-axis space, and aligns each child individually within the
cross axis. A child with `LayoutElementEcsComponent.ignoreLayout: true` is
skipped entirely - useful for a decorative element (a background flourish, a
badge) placed inside an otherwise-arranged panel.

[`addGridLayoutGroupComponent`](/Forge/docs/api/functions/addGridLayoutGroupComponent)
arranges direct children into cells - `constraint` picks whether the column
count is derived from the content box's width (`flexible`, the default) or
held fixed (`fixedColumnCount`/`fixedRowCount`), and `startCorner`/
`startAxis` control placement order. By default (`columnWidthMode`/
`rowHeightMode: 'fixed'`), every cell is exactly `cellSize`, without
measuring its child at all - the original behavior, unchanged.

Setting `columnWidthMode` and/or `rowHeightMode` to `'content'` instead
derives that axis's column/row size from the largest measured preferred size
among the cells placed in it - the same way an HTML `<table>` auto-sizes its
columns. This is the tool for the classic label/control form layout: give
every row a "label" cell and a "control" cell, size the label column to
`'content'`, and every row's control lands at the same x position
automatically, sized to whichever label is actually widest - no hand-computed
offsets:

```ts
import {
  addGridLayoutGroupComponent,
  createLabel,
  createSlider,
  createToggle,
  uiAlignments,
} from '@forge-game-engine/forge/ui';

addGridLayoutGroupComponent(world, optionsGrid, {
  constraint: 'fixedColumnCount',
  constraintCount: 2,
  columnWidthMode: 'content',
  rowHeightMode: 'fixed',
  cellSize: { x: 0, y: 40 }, // x is ignored (content mode); y is every row's fixed height
  spacing: { x: 16, y: 12 },
  cellAlignment: uiAlignments.middleLeft,
});

createLabel(world, optionsGrid, {
  text: 'Music',
  fontAtlas,
  size: 20,
  sizeToText: true,
});
createSlider(world, optionsGrid, {
  /* ... */
});
createLabel(world, optionsGrid, {
  text: 'Fullscreen',
  fontAtlas,
  size: 20,
  sizeToText: true,
});
createToggle(world, optionsGrid, {
  /* ... */
});
```

A cell on a `'content'` axis always keeps its own measured size - unlike a
`'fixed'` cell, it never stretches to fill its column/row - so `cellAlignment`
(a `uiAlignments` preset, same shape as `childAlignment`) controls where a
cell narrower/shorter than its shared column/row sits within it. It has no
effect on a `'fixed'` axis, where a cell always fills `cellSize` exactly.

`columnWidthMode`/`rowHeightMode: 'content'` requires `constraint` to be
`fixedColumnCount` or `fixedRowCount` - `addGridLayoutGroupComponent` throws
for `'flexible'`, since a flexible grid's column count depends on column
width, which would itself depend on column count.

Layout groups nest: a `VerticalLayoutGroupEcsComponent`'s own measured
content size (used when a parent group, or a `ContentSizeFitterEcsComponent`,
asks) comes from recursively measuring its own children, so a horizontal row
of buttons can itself be one "row" inside an outer vertical group.

[`addContentSizeFitterComponent`](/Forge/docs/api/functions/addContentSizeFitterComponent)
resizes its own entity to match its measured content on each axis
(`unconstrained` leaves that axis alone; `minSize`/`preferredSize` fit to
it) - pair it with a layout group on the same entity to make a panel
shrink-wrap its arranged children, rather than the fixed size `createPanel`
was given.

[`addAspectRatioFitterComponent`](/Forge/docs/api/functions/addAspectRatioFitterComponent)
keeps an entity's size at a constant width-to-height ratio -
`widthControlsHeight`/`heightControlsWidth` derive one axis from the other;
`fitInParent`/`envelopeParent` derive both from the parent's own resolved
rect, useful for a thumbnail or minimap that shouldn't stretch with its
container.

Every layout group/fitter runs in `createUiLayoutGroupEcsSystem`/
`createUiAspectRatioFitterEcsSystem`, registered automatically by
`createUiCanvas` _before_ `createUiLayoutEcsSystem` - both read
`RectTransformEcsComponent.rect` as it stood at the end of the previous
frame (the same rect `createUiLayoutEcsSystem` is about to recompute this
tick), so a group whose own size just changed (a fresh entity, a nested
group, a content size fitter reacting to a resized child) arranges its
children against a one-frame-stale box. Like the rest of this module, this
converges within a frame or two rather than being tracked with dirty state.
