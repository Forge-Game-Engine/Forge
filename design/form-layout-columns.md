# Design: Column-Aligned Form Layout

| | |
| --- | --- |
| **Status** | Draft |
| **Engine version at time of writing** | `0.24.2` |

| Module | Change |
| --- | --- |
| `src/ui/components/layout-element-component.ts` | Modified — new `sizeToText` override field |
| `src/ui/components/layout-group-component.ts` | Modified — new `columnWidthMode`/`rowHeightMode`/`cellAlignment` fields on `GridLayoutGroupEcsComponent` |
| `src/ui/systems/ui-layout-group-system.ts` | Modified — `createMeasure`'s plain-entity fallback reads `TextMeshEcsComponent.bounds` when `sizeToText` is set; `measureGridContent`/`arrangeGrid` gain content-driven column/row sizing |
| `documentation-site/docs/docs/ui/index.md` | Modified — document both additions, update "Known limitations" |
| `documentation-site/src/pages/demos/ui-nested-resize/_create-options-content.ts` | Modified — replace the hand-computed `labelWidth`/`controlX` offsets with the new grid mode |
| `documentation-site/src/pages/demos/layout-groups/*` | Modified — the inventory grid demo already exercises `GridLayoutGroupEcsComponent`; extend it (or add a sibling demo) to show a content-sized column, so the feature has a live example beyond `ui-nested-resize` |

## 1. Summary

Every existing Forge layout group either measures a child's own natural size
(`HorizontalLayoutGroupEcsComponent`/`VerticalLayoutGroupEcsComponent`) or
ignores it entirely in favor of a fixed `cellSize`
(`GridLayoutGroupEcsComponent`). Neither combination can produce the single
most common two-dimensional form pattern: a label column and a control
column, where every row's control should start at the same x position, but
the column has to be exactly as wide as the longest label actually is - a
width that isn't known until the labels' own text is measured, and that
should keep sibling rows' widest label as the shared value.

Today, building that layout means hand-computing pixel offsets per entity -
exactly what `documentation-site/src/pages/demos/ui-nested-resize/_create-options-content.ts`
does (`labelWidth = 140`, `controlX = labelX + labelWidth + 16`, both magic
numbers, both silently wrong the moment a label's text or font size
changes). This design closes that gap with two additions:

1. **Label text auto-sizing** (`LayoutElementEcsComponent.sizeToText`) - lets
   the layout/measure pipeline read a label's actual shaped-text bounds as
   its preferred size, instead of whatever `sizeOrMargin` the caller
   hardcoded at creation time.
2. **Content-sized grid columns and rows** (two new
   `GridLayoutGroupEcsComponent` fields) - lets a grid derive each column's
   width (and/or each row's height) from the largest measured cell in that
   column/row, the same way an HTML `<table>` or a Unity/Unreal table layout
   auto-sizes its columns, rather than only supporting `GridLayoutGroupEcsComponent`'s
   current fixed, uniform `cellSize`.

Together, these let a "Music" label and a "Fullscreen" label size themselves
to their own text, and let the grid derive one shared column width from
whichever is wider - so every row's control aligns on the same left edge
automatically, with no per-demo pixel math.

## 2. Scope

### In scope

- A new `sizeToText` override on `LayoutElementEcsComponent`, read by the
  existing measurement pipeline in `ui-layout-group-system.ts`.
- Two new fields on `GridLayoutGroupEcsComponent` -
  `columnWidthMode`/`rowHeightMode` (`'fixed' | 'content'`, both defaulting
  to `'fixed'` - fully backward compatible, every existing grid keeps its
  current fixed-`cellSize` behavior unchanged) - plus a `cellAlignment`
  field controlling where a cell's own content sits within a
  content-derived column/row that's larger than that specific cell.
- Updating `measureGridContent`/`arrangeGrid` to compute per-column widths
  and per-row heights when either mode is `'content'`, reusing the same
  recursive `Measure` function axis groups already use - no new measurement
  concept, just a new consumer of the existing one.
- Validating the `'content'` mode against `GridLayoutGroupEcsComponent.constraint`
  (see Decision Log, DL-02) and throwing a descriptive error for the
  unsupported combination.
- Updating `documentation-site/docs/docs/ui/index.md`'s "Layout groups" and
  "Known limitations" sections.
- Migrating `ui-nested-resize`'s options content to the new grid mode,
  removing its hardcoded `labelWidth`/`controlX`.
- Adding or extending a documentation-site demo that shows a content-sized
  grid independent of `ui-nested-resize` (which is about live-resizing
  nested anchors, not about form layout - the feature needs its own,
  clearer example).

### Out of scope

- **A distinct "table layout group" component.** Everything this design
  needs is an extension of the existing `GridLayoutGroupEcsComponent`'s
  placement model (row/column index, `constraint`, `startCorner`,
  `startAxis`); introducing a second, largely-overlapping component for
  "arrange children into rows and columns" would be a worse API surface for
  consumers than one component with an additional sizing mode. See DL-01.
- **`'flexible'` constraint combined with content sizing.** Deriving column
  count from available width, when column width itself depends on which
  cells land in which column, is circular; `'content'` mode requires
  `'fixedColumnCount'` or `'fixedRowCount'`. Revisit only if a concrete use
  case needs it.
- **Per-cell stretch-to-fill for a content-sized axis.** A cell on a
  `'content'` axis keeps its own measured size and is positioned via
  `cellAlignment`; there's no force-expand equivalent (axis groups' own
  `childForceExpandWidth`/`Height`) to stretch a narrower cell to fill its
  column. Nothing in the motivating use case needs it, and it can be added
  later without a breaking change if a real one comes up.
- **Auto-sizing anything other than labels.** `sizeToText` only ever reads
  `TextMeshEcsComponent.bounds`; it has no bearing on sprites, panels, or
  any other UI element - those already have `LayoutElementEcsComponent`'s
  existing `preferredWidth`/`preferredHeight` overrides for a manual
  equivalent.
- **Dynamic runtime text changes.** `sizeToText` reads whatever
  `TextMeshEcsComponent.bounds` currently holds every frame (the same
  recompute-every-frame model the rest of this module already uses - see
  DL-03), so a label whose text changes at runtime keeps sizing correctly
  automatically. No new API is needed for this; noting it here only because
  it's a natural question, not because there's design work behind it.

## 3. Phases

Each phase ships and is useful independently - Phase 1 has value with no
labels involved (e.g. a content-sized grid of variously-sized panels/icons),
and Phase 0 has value with no grid involved (any layout group already
benefits from a label reporting its true measured width instead of a
hardcoded one).

### Phase 0 — Label text auto-sizing

Lets a label's preferred size, for measurement purposes only, come from its
own shaped text rather than a hand-set `sizeOrMargin`.

| Task | Description | Size |
| --- | --- | --- |
| Add `sizeToText` field | New optional `boolean` field on `LayoutElementEcsComponent`, defaulting to `false` via `addLayoutElementComponent`'s existing defaulting pattern | S |
| Wire into `createMeasure` | In `ui-layout-group-system.ts`, when an entity's `LayoutElementEcsComponent.sizeToText` is `true`, read `TextMeshEcsComponent.bounds.width`/`height` as that axis's `preferred` (and `min`, since a label shouldn't shrink below its own ink) instead of falling back to `RectTransformEcsComponent.sizeOrMargin`; throw a descriptive error if the entity has no `TextMeshEcsComponent` (see DL-04, `TextEcsComponent` vs `TextMeshEcsComponent` timing) | M |
| `createLabel` convenience | Add a `sizeToText?: boolean` option to `CreateLabelOptions` that, when `true`, attaches a `LayoutElementEcsComponent` with `sizeToText: true` for the caller, so the common case doesn't need two separate calls | S |
| Unit tests | Cover: a plain label with `sizeToText` reports its shaped bounds; a label without it keeps today's `sizeOrMargin` fallback; the error path for `sizeToText` on a non-text entity; `sizeToText` composing with an explicit `preferredWidth`/`Height` override (the explicit override should still win, per `LayoutElementEcsComponent`'s existing per-field precedence) | M |

**Definition of done:** a label created via `createLabel(..., { sizeToText: true })`
inside any existing layout group (axis or grid) sizes itself to its own text
with zero manual `sizeOrMargin`, verified by a unit test asserting the
group's arrangement reflects two labels of different text lengths differently.

### Phase 1 — Content-sized grid columns and rows

The core of this design: lets `GridLayoutGroupEcsComponent` derive column
width / row height from measured content instead of only a fixed `cellSize`.

| Task | Description | Size |
| --- | --- | --- |
| New component fields | `columnWidthMode`/`rowHeightMode: 'fixed' \| 'content'` (default `'fixed'`) and `cellAlignment: UiAlignment` (default `uiAlignments.topLeft`) on `GridLayoutGroupEcsComponent`/`addGridLayoutGroupComponent`, following the file's existing default-options-object convention | S |
| Constraint validation | `addGridLayoutGroupComponent` throws a descriptive error when either mode is `'content'` and `constraint` is `'flexible'` (see Scope/Out of scope and DL-02) | S |
| Column/row measurement | Extend `measureGridContent` to accept the same `Measure` function `measureAxisGroupContent` already receives, compute each column's/row's size as the max of its cells' measured preferred size (for a `'fixed'` axis, keep exactly today's `cellSize`-only math) - see Design sub-section 6.1 for the exact algorithm | L |
| Arrangement | Extend `arrangeGrid` to size/position each cell using the computed column widths/row heights: a `'fixed'` axis keeps today's forced full-cell resize; a `'content'` axis leaves the cell at its own measured size, offset within its column/row by `cellAlignment` - see Design sub-section 6.2 | L |
| `startCorner`/`startAxis` correctness | Verify (and add regression tests for) every `startCorner`/`startAxis` combination against content-sized columns/rows specifically - the existing fixed-`cellSize` grid's corner/axis flip is index-only and cheap to get right by construction, but a flip that also has to relabel which *physical* column a *logical* column's measured width belongs to is a new failure mode this design introduces (see Design sub-section 6.2's prefix-sum approach) | M |
| Unit tests | Cover: two-column content-sized grid with rows of unequal label width, shared column width equals the max; mixed mode (one fixed axis, one content axis); `cellAlignment` centering/right-aligning a narrower cell within its column; the `'flexible'` + `'content'` validation error; nesting (a content-sized grid inside a `ContentSizeFitterEcsComponent`, or inside another layout group, measuring correctly) | L |

**Definition of done:** a two-column, `fixedColumnCount: 2`,
`columnWidthMode: 'content'` grid, given a "Music"-length label + a wide
control in row 1 and a "Fullscreen"-length label + a narrow control in row
2, places both controls at the same x position, verified by a unit test
reading both cells' resolved `RectTransformEcsComponent.rect`.

### Phase 2 — Documentation and demo migration

| Task | Description | Size |
| --- | --- | --- |
| `documentation-site/docs/docs/ui/index.md` | Document `sizeToText` under "Labels", the two new grid fields under "Layout groups", following the file's existing terminology and cross-linking conventions (`UiAnchor`-style prose, links to the generated API reference) | M |
| Migrate `ui-nested-resize` | Replace `_create-options-content.ts`'s hardcoded `labelWidth`/`controlX` with a `columnWidthMode: 'content'` grid hosting the "Music"/slider and "Fullscreen"/toggle rows, using `sizeToText` labels | M |
| New/extended demo | Add a content-sized-grid example to `documentation-site/src/pages/demos/layout-groups/` (its existing `_create-inventory-grid.ts` already shows `GridLayoutGroupEcsComponent` - either extend it with a labeled options panel, or add a sibling `_create-options-form.ts`), since `ui-nested-resize` is the wrong place to be the feature's primary illustration | M |
| Full demo verification | Per `AGENTS.md`'s "Documentation Site Demos" section: rebuild `/dist`, `documentation-site`'s `typecheck`/`build`, and a manual browser check of both demos | S |

**Definition of done:** `ui-nested-resize`'s options content has no
hardcoded column-alignment constants left, and a browser check confirms the
Music/Fullscreen rows still align identically to today's hand-tuned result.

## 4. Decision log

### DL-01 — Extend `GridLayoutGroupEcsComponent`, don't add a `TableLayoutGroupEcsComponent`

**Options considered:**

- A new, standalone `TableLayoutGroupEcsComponent` modeled directly on
  HTML `<table>`/Unity `TableLayoutPanel` semantics.
- Extend the existing `GridLayoutGroupEcsComponent` with a per-axis sizing
  mode.

**Decision:** Extend `GridLayoutGroupEcsComponent`.

**Rationale:** The two concepts already share their entire placement model -
row/column index derivation, `constraint`, `startCorner`, `startAxis`,
`childAlignment` for the whole block. The only real difference is *where a
column's width comes from* (a fixed value vs. measured content), which is a
narrower, additive change to one component rather than a second component
that would force every consumer to learn "grid vs. table" as a first
decision, when the actual decision is one field.

**Tradeoff:** `GridLayoutGroupEcsComponent`'s interface grows two fields and
a validation rule, and `measureGridContent`/`arrangeGrid` grow real branching
logic instead of staying the simple, cheap functions they are today - a
maintenance cost this decision accepts in exchange for a single, coherent
"arrange into rows and columns" primitive.

**Assumption:** No use case needs *both* a fixed-`cellSize` grid and a
content-sized grid to compose in ways that would be cleaner as two
components than as one with a mode flag. If one turns up, it would be a
signal to revisit this decision, not a signal that this decision was
premature.

### DL-02 — `'content'` sizing requires a fixed row or column count

**Options considered:**

- Support `'flexible'` by iterating: guess a column count, measure, refit,
  repeat until stable.
- Require `'fixedColumnCount'`/`'fixedRowCount'` when either axis is
  `'content'`; throw for `'flexible'`.

**Decision:** Require a fixed count; throw for the unsupported combination.

**Rationale:** `'flexible'`'s column count depends on how much content-box
width is available once column widths are known - and column widths depend
on which cells fall into which column, which depends on the column count.
An iterate-to-convergence approach is solvable, but adds real complexity
(how many iterations, does it always converge, what happens under
`createUiLayoutGroupEcsSystem`'s existing one-frame-stale-rect model) for a
combination nothing in this design's motivating use case needs - a two- or
three-column form always knows its column count up front.

**Tradeoff:** A consumer who genuinely wants both flexible wrapping and
content-sized columns has no path today; they get a clear error pointing at
`fixedColumnCount`/`fixedRowCount` instead, rather than either silently
wrong behavior or unbounded per-frame iteration cost.

### DL-03 — `sizeToText` re-reads `TextMeshEcsComponent.bounds` every frame, not once at creation

**Options considered:**

- Measure once when the label is created (or once when `sizeToText` is
  first added) and freeze the resulting `sizeOrMargin`.
- Re-read `TextMeshEcsComponent.bounds` every frame `createMeasure` runs,
  same as every other field in `createMeasure`.

**Decision:** Re-read every frame.

**Rationale:** This module already recomputes layout in full every frame
rather than tracking dirty state (`createUiLayoutEcsSystem`'s own
documented model, and `createUiLayoutGroupEcsSystem`'s doc comment above).
A one-shot measurement would be the only place in the whole layout pipeline
that special-cases "compute once," and would silently go stale the moment a
label's text changes at runtime (localization, a dynamic value like a
volume percentage) - exactly the kind of surprising behavior this design
should avoid.

**Tradeoff:** None functionally; `TextMeshEcsComponent.bounds` is already
computed every frame `text-shaping-system.ts` reshapes a changed string
(and is a plain field read otherwise), so this adds no new per-frame cost
beyond the measurement pipeline's existing per-entity work.

### DL-04 — `sizeToText` requires a `TextMeshEcsComponent`, not just a `TextEcsComponent`

**Options considered:**

- Accept `sizeToText` on any entity with a `TextEcsComponent`, falling back
  to `0`/`sizeOrMargin` if shaping hasn't produced a `TextMeshEcsComponent`
  yet.
- Require `TextMeshEcsComponent` to already exist; throw otherwise.

**Decision:** Require `TextMeshEcsComponent`.

**Rationale:** `TextMeshEcsComponent` (glyph quads + bounds) is only added
by `text-shaping-system.ts` once shaping actually runs; a `TextEcsComponent`
alone doesn't have bounds to read yet. `createTextShapingEcsSystem` is
already required by every demo using labels and runs every frame, so in
practice this component exists by the time layout groups run except on the
very first frame an entity is created - the same one-frame lag every other
freshly-created entity in this system already has (see this file's own doc
comment on `createUiLayoutGroupEcsSystem` about one-frame-stale rects).
Silently falling back to `0` would hide a genuine misconfiguration (missing
`createTextShapingEcsSystem` registration, or `sizeToText` on a non-label
entity) behind a confusing "everything's zero-width" symptom instead of a
clear error at the point of misuse.

**Tradeoff:** A brand-new label with `sizeToText: true` measures as `0` for
exactly one frame before `text-shaping-system.ts` first runs, rather than
never. This matches the one-frame convergence behavior every other part of
this module already accepts by design (see `design/ui-system.md`'s DL-12,
"Full recompute per frame; no dirty tracking in v1") rather than
introducing a new kind of inconsistency.

## 5. Open questions

1. **Should `sizeToText` live on `LayoutElementEcsComponent`, or become a
   `CreateLabelOptions`-only convenience with no queryable component at
   all?** This design puts it on `LayoutElementEcsComponent` so it composes
   with every other override field (`preferredWidth` still wins if both are
   set) and so it can be toggled at runtime, not just at creation. Confirm
   this is the right home before implementation - it's the one part of this
   design without a precedent to lean on (`preferredWidth`/`Height` are
   plain numeric overrides; `sizeToText` is the first override whose value
   depends on *another component*).
2. **Does `cellAlignment` need independent horizontal/vertical values, or is
   one `UiAlignment` (the existing `Vector2`-shaped preset) enough?** This
   design reuses `UiAlignment` directly, matching `childAlignment`'s
   existing shape on both group types - flag if a real layout needs, say,
   left-aligned labels but centered controls in the same grid, which would
   need per-column (not per-grid) alignment instead.
3. **Should the new demo (Phase 2) replace `layout-groups`' existing
   inventory grid, or sit alongside it as a fourth panel?** The existing
   three-panel structure (Menu/Toolbar/Inventory) is a deliberate one-panel-
   per-feature split (see `6b9c85da`'s commit splitting the old monolithic
   demo) - confirm whether a fourth "Options form" panel fits that pattern
   or deserves its own demo page.
4. **Is a validation error the right failure mode for `'flexible'` +
   `'content'` (DL-02), or should it just be silently disallowed by the
   type system** (e.g. a discriminated union making the combination
   unrepresentable)? A type-level fix is more idiomatic for this codebase's
   "narrow types, handle nullish values" convention, but
   `GridLayoutGroupDefaultedOptions` is a flat, mutable-in-place interface
   today (every field independently settable after creation via the
   returned component reference) - worth confirming a discriminated union
   doesn't fight that pattern before committing to the runtime-check
   version this design assumes.

## 6. Design sub-sections

### 6.1 Column/row measurement algorithm

`measureGridContent` already exists and, for a `'fixed'` grid, simply
multiplies `cellSize` by the derived column/row count (see
`ui-layout-group-system.ts`'s current implementation). This design extends
it to also accept the same `measure: Measure` function
`measureAxisGroupContent` already receives, and to branch per axis:

```
function measureGridContent(world, entity, grid, childrenByParent, measure): Measured {
  const children = arrangeableChildrenOf(world, childrenByParent, entity)
  const { columns, rows } = gridDimensions(grid, children.length, undefined)

  const columnWidths = new Array(columns).fill(grid.cellSize.x)
  const rowHeights = new Array(rows).fill(grid.cellSize.y)

  if (grid.columnWidthMode === 'content' || grid.rowHeightMode === 'content') {
    for (let i = 0; i < children.length; i++) {
      const { column, row } = logicalCellOf(grid, i, columns, rows) // startAxis only, no corner flip - see 6.2
      const measured = measure(children[i])

      if (grid.columnWidthMode === 'content') {
        columnWidths[column] = Math.max(columnWidths[column], measured.width.preferred)
      }
      if (grid.rowHeightMode === 'content') {
        rowHeights[row] = Math.max(rowHeights[row], measured.height.preferred)
      }
    }
  }

  const width = sum(columnWidths) + grid.spacing.x * (columns - 1) + grid.padding.left + grid.padding.right
  const height = sum(rowHeights) + grid.spacing.y * (rows - 1) + grid.padding.top + grid.padding.bottom

  return {
    width: { min: width, preferred: width, flexible: 0 },
    height: { min: height, preferred: height, flexible: 0 },
  }
}
```

`logicalCellOf` is the existing `row`/`column` derivation `arrangeGrid`
already computes from `i`, `columns`, `rows`, and `grid.startAxis` - *before*
`startCorner`'s flip is applied. Sizing is computed in logical (unflipped)
space; only physical placement (6.2) needs the flip.

### 6.2 Arrangement algorithm

`arrangeGrid` currently places cell `i` at a corner-flipped
`(actualColumn, actualRow)` and unconditionally resizes it to `cellSize`.
This design changes the resize to be per-axis-conditional, and changes the
cell's physical offset from `actualColumn * cellSize.x` to a prefix sum over
the (possibly non-uniform) column widths - in *physical*, not logical,
order, since a flipped grid's physical column `0` holds whichever logical
column ends up there:

```
function arrangeGrid(world, entity, grid, childrenByParent, measure): void {
  // columnWidths, rowHeights computed exactly as in 6.1

  const flipColumn = grid.startCorner === 'upperRight' || grid.startCorner === 'lowerRight'
  const flipRow = grid.startCorner === 'lowerLeft' || grid.startCorner === 'lowerRight'

  const physicalColumnWidths = columnWidths.map((_, physical) =>
    columnWidths[flipColumn ? columns - 1 - physical : physical]
  )
  const physicalRowHeights = rowHeights.map((_, physical) =>
    rowHeights[flipRow ? rows - 1 - physical : physical]
  )

  const columnOffsets = prefixSum(physicalColumnWidths, grid.spacing.x)
  const rowOffsets = prefixSum(physicalRowHeights, grid.spacing.y)

  for (let i = 0; i < children.length; i++) {
    const { column, row } = logicalCellOf(grid, i, columns, rows)
    const actualColumn = flipColumn ? columns - 1 - column : column
    const actualRow = flipRow ? rows - 1 - row : row

    const columnWidth = columnWidths[column]   // logical index - this cell's own column's measured width
    const rowHeight = rowHeights[row]

    const childMeasured = measure(children[i])
    const cellWidth = grid.columnWidthMode === 'content' ? childMeasured.width.preferred : columnWidth
    const cellHeight = grid.rowHeightMode === 'content' ? childMeasured.height.preferred : rowHeight

    childRect.sizeOrMargin = { x: cellWidth, y: cellHeight }

    const offsetX = (columnWidth - cellWidth) * grid.cellAlignment.x
    const offsetY = (rowHeight - cellHeight) * grid.cellAlignment.y

    childRect.anchoredPosition = {
      x: contentLeft + columnOffsets[actualColumn] + offsetX,
      y: contentBottom + gridContentHeight - rowOffsets[actualRow] - rowHeight + offsetY,
    }
  }
}
```

Note `cellAlignment` needs no special-casing per mode: on a `'fixed'` axis,
`cellWidth === columnWidth` always (today's forced-fill behavior,
unchanged), so `offsetX` is always `0` regardless of `cellAlignment` -  the
same formula produces both behaviors.

### 6.3 API sketch

```ts
export type UiGridSizingMode = 'fixed' | 'content';

export interface GridLayoutGroupDefaultedOptions {
  padding: UiLayoutGroupPadding;
  cellSize: Vector2; // still consulted per-axis when that axis's mode is 'fixed'
  spacing: Vector2;
  childAlignment: UiAlignment;
  startCorner: UiGridLayoutGroupCorner;
  startAxis: UiGridLayoutGroupAxis;
  constraint: UiGridLayoutGroupConstraint;
  constraintCount: number;

  /** New: derives column width from measured cell content instead of `cellSize.x`. */
  columnWidthMode: UiGridSizingMode; // default 'fixed'

  /** New: derives row height from measured cell content instead of `cellSize.y`. */
  rowHeightMode: UiGridSizingMode; // default 'fixed'

  /**
   * New: where a cell's own content sits within its column/row when that
   * axis's mode is 'content' and this specific cell is narrower/shorter
   * than the shared column/row size. No effect on a 'fixed' axis, where a
   * cell always fills `cellSize` exactly.
   */
  cellAlignment: UiAlignment; // default uiAlignments.topLeft
}

export interface LayoutElementEcsComponent extends LayoutElementDefaultedOptions {
  minWidth?: number;
  minHeight?: number;
  preferredWidth?: number;
  preferredHeight?: number;
  flexibleWidth?: number;
  flexibleHeight?: number;

  /**
   * New: this entity's preferred (and min) size, on whichever axis this is
   * relevant to, comes from its own `TextMeshEcsComponent.bounds` instead of
   * `RectTransformEcsComponent.sizeOrMargin`. Requires a `TextMeshEcsComponent`
   * on the same entity - throws otherwise. An explicit `preferredWidth`/
   * `preferredHeight` still overrides this, same precedence as every other
   * `LayoutElementEcsComponent` field.
   */
  sizeToText?: boolean;
}
```

Usage, replacing `_create-options-content.ts`'s hardcoded offsets:

```ts
const optionsGrid = world.createEntity();
// ... addPositionComponent, addParentComponent, addRectTransformComponent ...

addGridLayoutGroupComponent(world, optionsGrid, {
  constraint: 'fixedColumnCount',
  constraintCount: 2,
  columnWidthMode: 'content',
  rowHeightMode: 'fixed',
  cellSize: { x: 0, y: 40 }, // x ignored (content mode); y is every row's fixed height
  spacing: { x: 16, y: 12 },
  cellAlignment: uiAlignments.middleLeft,
});

createLabel(world, optionsGrid, { text: 'Music', fontAtlas, size: 20, sizeToText: true, /* ... */ });
createSlider(world, optionsGrid, { /* ... */ }); // no anchoredPosition/sizeOrMargin math needed
createLabel(world, optionsGrid, { text: 'Fullscreen', fontAtlas, size: 20, sizeToText: true, /* ... */ });
createToggle(world, optionsGrid, { /* ... */ });
```

### 6.4 Performance considerations

Both additions reuse the existing `Measure` function, which is already
memoized per entity per frame (`createMeasure`'s `cache`) - a content-sized
grid's per-cell `measure()` call inside the new loops in 6.1/6.2 is a cache
hit for every entity the outer `createUiLayoutGroupEcsSystem.update` loop
already warmed. The added cost is O(children) extra array writes for
`columnWidths`/`rowHeights`/prefix sums, on top of work `arrangeGrid`
already does per cell - no new asymptotic complexity, and no cost at all
for the (unchanged, default) `'fixed'` mode path.

### 6.5 Testing considerations

Per `AGENTS.md`'s testing conventions, new coverage lands in
`layout-element-component.test.ts`, `layout-group-component.test.ts`, and
`ui-layout-group-system.test.ts` alongside the existing tests for each
component/system, not in new files - these are additive fields on existing
components/systems, not new modules. Phase 1's `startCorner`/`startAxis`
correctness task (see Phase 1 table) specifically needs a test matrix over
all four corners crossed with both `startAxis` values, asserting resolved
`rect` positions - the existing grid tests only assert this for uniform
`cellSize`, which can't catch a column-width/physical-index mismatch; the
logical-vs-physical indexing in section 6.2 is the one part of this design
with real room for an off-by-one.

### 6.6 Documentation considerations

`documentation-site/docs/docs/ui/index.md`'s existing "Labels" section gets
a short `sizeToText` paragraph near its existing size-related prose; its
"Layout groups" section's existing `GridLayoutGroupEcsComponent` paragraph
(see the file's current line ~530) gets extended with `columnWidthMode`/
`rowHeightMode`/`cellAlignment`, following the same
"`[api link]` does X - `field` controls Y" prose pattern the rest of that
section already uses. "Known limitations" doesn't need a new bullet removed
(this design doesn't touch scroll views/clipping), but should gain a note
if Open Question 2 (per-column alignment) or 4 (flexible + content) is
resolved as "not supported yet" rather than "not applicable."
