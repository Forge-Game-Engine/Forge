---
sidebar_position: 7
---

# Layout Groups

Every element seen so far is positioned manually - an explicit anchor and
`anchoredPosition`. A layout group instead arranges its own direct children
automatically, recomputing every frame just like `createUiLayoutEcsSystem`
itself does:

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

_A horizontal group arranges its direct children left to right; a vertical
group, top to bottom - both within the group's own padded content box, with
`spacing` between adjacent children._

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

// createUiLayoutGroupEcsSystem (registered by registerUiSystems) resizes
// and stacks every direct child added below - no anchor of its own needed.
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

## Grid layout groups

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

_A grid group's cells fill in `startAxis` order (horizontal, here) from
`startCorner` (upper-left, here), wrapping to the next row/column once
`constraint`'s column/row count is reached._

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

`columnWidthMode`/`rowHeightMode: 'content'` is only available once
`constraint` is `'fixedColumnCount'`/`'fixedRowCount'` - a flexible grid's
column count depends on column width, which would itself depend on column
count, so the type checker rejects that combination for `'flexible'`
outright rather than accepting it and failing at runtime.

Layout groups nest: a `VerticalLayoutGroupEcsComponent`'s own measured
content size (used when a parent group, or a `ContentSizeFitterEcsComponent`,
asks) comes from recursively measuring its own children, so a horizontal row
of buttons can itself be one "row" inside an outer vertical group.

## Fitting content

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
`createUiAspectRatioFitterEcsSystem`, registered by `registerUiSystems`
_before_ `createUiLayoutEcsSystem` - both read
`RectTransformEcsComponent.rect` as it stood at the end of the previous
frame (the same rect `createUiLayoutEcsSystem` is about to recompute this
tick), so a group whose own size just changed (a fresh entity, a nested
group, a content size fitter reacting to a resized child) arranges its
children against a one-frame-stale box. Like the rest of this module, this
converges within a frame or two rather than being tracked with dirty state.

:::info[Known limitation]
There's no per-column/row `cellAlignment` on a content-sized grid - one
`cellAlignment` applies to every column/row in the grid, so there's no way
to, say, left-align a label column while centering a control column in the
same grid.
:::
