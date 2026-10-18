<!-- cspell:words tilemap tilemaps tileset tilesets walkability -->

# Grid layouts for orthogonal and isometric cells

Issue: [#869](https://github.com/Forge-Game-Engine/Forge/issues/869)
(milestone "Tilemaps"; used by #805, #812, #825, #839 and #871)

| Module or file                                              | Change   | Notes                                                                                                                     |
| ----------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/math/grid-layout/grid-layout.ts`                       | New      | The `GridLayout` interface, `GridCell` and `GridCellRange`                                                                |
| `src/math/grid-layout/lattice-grid-layout.ts`               | New      | `LatticeGridLayout`, the one implementation both factories return. Not exported                                           |
| `src/math/grid-layout/create-orthogonal-grid-layout.ts`     | New      | `createOrthogonalGridLayout({ cellWidth, cellHeight })`, `OrthogonalGridLayoutOptions`                                    |
| `src/math/grid-layout/create-isometric-grid-layout.ts`      | New      | `createIsometricGridLayout({ cellWidth, cellHeight })`, `IsometricGridLayoutOptions`                                      |
| `src/math/grid-layout/index.ts`, `src/math/index.ts`        | Modified | Export the folder through `@forge-game-engine/forge/math`                                                                 |
| `src/math/grid-layout/test-helpers/grid-layout-contract.ts` | New      | `describeGridLayoutContract`, the property tests every layout passes ("Testing"). Excluded from `/dist` like every helper |
| `src/math/grid-layout/*.test.ts`                            | New      | The contract suite run against both factories, plus each layout's exact values                                            |
| `documentation-site/docs/docs/math/grid-layouts.md`         | New      | The "Grid layouts" guide                                                                                                  |
| `documentation-site/docs/docs/math/index.md`                | Modified | Lists the new guide                                                                                                       |
| `CHANGELOG.md`                                              | Modified | `#### Added` bullet (math)                                                                                                |
| **Engine version at time of design**                        |          | `0.26.2`                                                                                                                  |

## Summary

Tilemaps (#805, #812, #825) and navigation grids (#776, #839, #871) all
turn cells into positions and positions into cells, and isometric games need
that conversion to be a diamond projection, not a rectangle grid. This
design adds one general-purpose type for it to `src/math`: a `GridLayout`
describes where every cell of an unbounded grid is, and nothing else. It
holds no cells, no tiles and no walkability; the tile layer and the
navigation grid that hold those each take a `GridLayout`, so a tile layer
and a navigation grid built from the same layout agree on every cell.

```ts
const layout = createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 });

layout.getCellCenter(1, 0); // { x: 32, y: 32 }
layout.localToCell({ x: 32, y: 32 }); // { column: 1, row: 0 }
```

It's the same idea as Unity's `GridLayout` with its cell layouts, Godot's
`TileSet.tile_shape` with `tile_layout`, Tiled's map `orientation` and
`bevy_ecs_tilemap`'s `TilemapType`. Two layouts ship:

- **Orthogonal**: cells are `cellWidth` by `cellHeight` rectangles.
- **Isometric**: cells are diamonds `cellWidth` wide and `cellHeight` tall,
  Tiled's `"isometric"` orientation and Godot's `TILE_LAYOUT_DIAMOND_DOWN`.
  A 2:1 isometric tile is `64` by `32`.

The design has four parts:

- **An interface, two factories, one implementation.** `GridLayout` is an
  interface, and callers never ask which layout they have. Both layouts
  are linear maps of a square grid, so both factories return the same
  internal class, built from the two vectors one step along a column and
  one step along a row. Every method comes from that map and its inverse.
- **Continuous cell space.** A layout exposes the map itself
  (`cellSpaceToLocal`, `localToCellSpace`), in which cell `(c, r)` is the
  unit square `[c, c + 1) x [r, r + 1)`. Tile collision (#825), navigation
  baking (#839, #871) and culling turn shapes into cell space and work on
  unit squares there, so they have one code path for both layouts.
- **Exact cell boundaries.** Every point belongs to exactly one cell, by a
  stated half-open rule, and corners shared by neighboring cells are
  computed by one formula from their integer cell-space position, so
  neighbors' edges match bit for bit and tile meshes (#812) have no cracks.
- **A draw-order guarantee.** Drawing cells in row-major order is back to
  front for both layouts, with or without chunks, for tile images within
  stated limits. Tile rendering (#812) relies on it instead of sorting
  tiles.

Nothing here bends a core design of the engine. A `GridLayout` is plain,
immutable math with no dependency on an `EcsWorld`, like `Rect` and
`Vector2`. It lives in `src/math` rather than `src/tilemaps` because
navigation must not depend on tilemaps.

## Scope

### In scope

- The `GridLayout` interface and its contract: Y-down cells, which cell owns
  each edge and corner, the affine cell space, polygon winding, and the
  draw-order guarantee with its preconditions.
- `createOrthogonalGridLayout` and `createIsometricGridLayout`, with
  validation of `cellWidth` and `cellHeight`.
- The members `cellWidth`, `cellHeight`, `getCellCenter`, `localToCell`,
  `localToCellSpace`, `cellSpaceToLocal`, `getCellPolygon`,
  `getCellFootprintBounds` and `getCellRangeForLocalRect`.
- A contract test suite that any layout runs, and each layout's exact
  values.
- JSDoc on every export, the "Grid layouts" guide in the math docs and a
  changelog bullet.

### Out of scope

- **Staggered isometric and hexagonal layouts.** Their cell space isn't
  affine and chunked row-major drawing isn't back to front for them, so
  adding one changes the `GridLayout` contract and its consumers (decision
  G4). That's a design of its own.
- **Anything that stores cells.** Tile data is #805, walkability and costs
  are #776. A `GridLayout` has no bounds, size or origin.
- **World space.** A layout works in the local space of whatever owns it.
  Going from world to local through an entity's `position.world`,
  `rotation.world` and `scale.world` is the owner's job (#805's world
  conversions, #776's `origin`).
- **Tile image placement.** Where a tile's image sits on its cell, and its
  `textureOrigin`, are #805's. This design only states the limits within
  which the draw-order guarantee holds.
- **Tiled's x offset.** Tiled shifts an isometric map right by
  `mapHeight * tileWidth / 2` so a finite map starts on positive pixels. A
  `GridLayout` has no such offset; the Tiled importer (#836) applies it to
  the layer's position if it wants Tiled's pixel positions.
- **Cell gaps, swizzles and height.** Unity's `Grid.cellGap`,
  `cellSwizzle` and its "Isometric Z as Y" layout have no use in the
  issues that consume this. Elevation in an isometric game is a separate
  layer or a `textureOrigin`.
- **Moving polygon helpers into `src/math`.** `calculateSignedArea` stays
  in `src/physics/colliders/polygon-math.ts` (open question 3).
- **A docs-site demo.** The tilemap milestone's demo shows layouts in use
  (open question 4).
- **Fixing #776's Y-up wording.** #871 owns making navigation grids Y-down
  and laying them out with a `GridLayout`.

## Coordinate conventions

Local space is Y-down like the rest of the engine (AGENTS.md "Angles and
Directions"): `+X` is right and `+Y` is down the screen. Columns increase
towards `+X` and rows towards `+Y`, as in Tiled, Godot and the DOM. Cell
`(0, 0)` has its cell-space origin, the corner at cell-space `(0, 0)`, at
the local origin.

A layout is a linear map from cell space to local space:

```
local = cellSpace.x * columnStep + cellSpace.y * rowStep
```

| Layout     | `columnStep` (one column)        | `rowStep` (one row)              | Cell `(c, r)`                                                                               |
| ---------- | -------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| Orthogonal | `(w, 0)`                         | `(0, h)`                         | The rect from `(c * w, r * h)` to `((c + 1) * w, (r + 1) * h)`                              |
| Isometric  | `(w / 2, h / 2)`, down and right | `(-w / 2, h / 2)`, down and left | The diamond whose top corner is `((c - r) * w / 2, (c + r) * h / 2)`, `w` wide and `h` tall |

(`w` is `cellWidth`, `h` is `cellHeight`.)

An isometric layout with `w = 64` and `h = 32`, cells labelled `column,row`:

```
                (0,0) top corner of cell 0,0
                  /\
                 /  \
                /0,0 \
               /\    /\
              /  \  /  \
             /0,1 \/ 1,0\
            /\    /\    /\
           /  \  /  \  /  \
          /0,2 \/ 1,1\/ 2,0\
          \    /\    /\    /
                 ...
```

Moving one column goes down and right, and moving one row goes down and
left. Cell `(1, 0)`'s top corner is `(32, 16)` and its center `(32, 32)`.

## API design

```ts
/** A cell of a grid: integer column and row. */
export interface GridCell {
  column: number;
  row: number;
}

/** An inclusive range of cells: every cell with a column from `minColumn`
 * to `maxColumn` and a row from `minRow` to `maxRow`. */
export interface GridCellRange {
  minColumn: number;
  minRow: number;
  maxColumn: number;
  maxRow: number;
}

/**
 * Where the cells of an unbounded, Y-down grid are in local space.
 * (JSDoc states the full contract below: ownership, cell space, winding
 * and the draw-order guarantee with its preconditions.)
 */
export interface GridLayout {
  /** The width of a cell's footprint bounds, in local units. */
  readonly cellWidth: number;
  /** The height of a cell's footprint bounds, in local units. */
  readonly cellHeight: number;

  /** The center of the cell's footprint. */
  getCellCenter(column: number, row: number): Vector2;
  /** The cell containing `point`. */
  localToCell(point: Vector2): GridCell;
  /** `point` in cell space, where cell (c, r) is [c, c + 1) x [r, r + 1). */
  localToCellSpace(point: Vector2): Vector2;
  /** The inverse of `localToCellSpace`. */
  cellSpaceToLocal(point: Vector2): Vector2;
  /** The footprint's four corners, clockwise on screen. */
  getCellPolygon(column: number, row: number): Vector2[];
  /** The footprint's axis-aligned bounds. */
  getCellFootprintBounds(column: number, row: number): Rect;
  /** The smallest range holding every cell that contains a point of `rect`. */
  getCellRangeForLocalRect(rect: Rect): GridCellRange;
}

export interface OrthogonalGridLayoutOptions {
  cellWidth: number;
  cellHeight: number;
}

export function createOrthogonalGridLayout(
  options: OrthogonalGridLayoutOptions,
): GridLayout;

export interface IsometricGridLayoutOptions {
  /** The diamond's full width, as in Tiled. */
  cellWidth: number;
  /** The diamond's full height, as in Tiled. */
  cellHeight: number;
}

export function createIsometricGridLayout(
  options: IsometricGridLayoutOptions,
): GridLayout;
```

### Member contracts

- **`cellWidth`, `cellHeight`**: what the factory was given. Both are the
  size of the cell's footprint bounds, so for an isometric layout they're
  the diamond's full width and height. A layout never changes: an owner
  that needs another cell size makes a new layout and rebuilds what it
  derived from the old one.
- **`getCellCenter(column, row)`**: `cellSpaceToLocal({ x: column + 0.5,
y: row + 0.5 })`, the center of the footprint. It's what a tile layer's
  `cellToLocal` and a navigation grid's `cellToWorld` return, and the
  origin of #825's tile-local collision space.
- **`localToCell(point)`**: the floor of `localToCellSpace(point)` on both
  axes, so it works for negative coordinates. Cell `(c, r)` owns the points
  of `[c, c + 1) x [r, r + 1)` in cell space, so every point is in exactly
  one cell:
  - orthogonal: a cell owns its top and left edges and its top-left corner;
  - isometric: a cell owns its top-left and top-right edges and its top
    corner. Its right corner belongs to `(c + 1, r)`, its left corner to
    `(c, r + 1)` and its bottom corner to `(c + 1, r + 1)`.

  Throws when `point` isn't finite, since no cell holds it.

- **`localToCellSpace(point)`, `cellSpaceToLocal(point)`**: the affine map
  and its inverse. The map is linear, so straight lines stay straight and a
  convex polygon stays convex: a consumer can map a polygon's vertices and
  rasterize the result against unit squares. The determinant is positive,
  so winding is kept too. Non-finite values pass through as they would in
  `Vec2`.
- **`getCellPolygon(column, row)`**: the cell-space corners `(c, r)`,
  `(c + 1, r)`, `(c + 1, r + 1)`, `(c, r + 1)` mapped to local space. That
  starts at the top-left corner of an orthogonal cell and the top corner of
  an isometric one, and turns clockwise on screen, so
  `calculateSignedArea` is positive, the winding `PolygonCollider` and
  #820's chain loops use around solid shapes.
- **`getCellFootprintBounds(column, row)`**: the min and max of the
  polygon's corners. #805 places a tile image's bottom-left corner on this
  rect's bottom-left corner.
- **`getCellRangeForLocalRect(rect)`**: maps the rect's four corners to
  cell space and floors the min and max on each axis. The range holds every
  cell that contains a point of `rect` (edges and corners included, under
  the ownership rule above), and it's the smallest range that does, since
  the corners that reach each extreme are points of the rect. For an
  isometric layout the touched cells form a diamond of cell indices, so the
  range also holds cells the rect doesn't reach (about half of a large
  range). Consumers that need the exact set map the rect into cell space
  and rasterize it. Throws when `rect` isn't finite or has `min` greater
  than `max` on either axis, because a caller loops over the range and an
  infinite or inverted one would hang or skip it silently.

Methods that take a `column` and `row` don't check that they're integers.
TypeScript can't express it, the check would sit in the inner loops of
mesh building and rasterization, and a fractional cell has a well-defined
answer (the same map). The JSDoc says the arguments are integer cells and
points to `cellSpaceToLocal` for continuous positions.

Every method returns new objects the caller owns, like `Rects.size` and
`CameraView.viewportToWorld` (decision G5).

## The shared lattice implementation

Both factories validate their options and return
`new LatticeGridLayout(cellWidth, cellHeight, columnStep, rowStep)`. The
class isn't exported. It keeps the two steps and their determinant
`det = columnStep.x * rowStep.y - columnStep.y * rowStep.x`, which is `w * h`
for an orthogonal layout and `w * h / 2` for an isometric one, both
positive.

```
cellSpaceToLocal(p):
  x = p.x * columnStep.x + p.y * rowStep.x
  y = p.x * columnStep.y + p.y * rowStep.y
  return { x: x + 0, y: y + 0 }            // + 0 turns -0 into 0

localToCellSpace(p):
  u = (p.x * rowStep.y - p.y * rowStep.x) / det
  v = (p.y * columnStep.x - p.x * columnStep.y) / det
  return { x: u + 0, y: v + 0 }

localToCell(p):
  assert p is finite
  s = localToCellSpace(p)
  return { column: floor(s.x) + 0, row: floor(s.y) + 0 }

getCellPolygon(c, r):
  return [cellSpaceToLocal(c, r), cellSpaceToLocal(c + 1, r),
          cellSpaceToLocal(c + 1, r + 1), cellSpaceToLocal(c, r + 1)]

getCellRangeForLocalRect(rect):
  assert rect is finite and min <= max
  map the four corners with localToCellSpace
  return floors of the min and max u and v
```

Why it's written this way:

- **One division, last.** The inverse multiplies first and divides once.
  The steps are `w`, `h` and their halves, and halving is exact in binary
  floating point, so for integer coordinates and integer cell sizes every
  product and sum is exact and the one division is correctly rounded. A
  point exactly on a cell edge then lands on an exact integer in cell space
  and `floor` gives the owning cell, rather than `x / w + y / h` rounding to
  `0.9999999` and picking a neighbor. Non-integer inputs are as accurate as
  two rounding steps allow, which the JSDoc says.
- **Corners from integer cell-space positions.** Two neighboring cells
  compute a shared corner from the same integer `(u, v)` with the same
  expression, so the results are identical. #812's chunk meshes depend on
  that to have no cracks between tiles.
- **No negative zero.** `Math.floor(-0)` is `-0`, and `-0` makes
  `toEqual` fail against `0` and prints as `-0` in a debugger. Adding `0`
  normalizes it at no cost.
- **One class.** Every `GridLayout` a game creates has the same hidden
  class, so the call sites in tilemap and navigation code stay monomorphic.
  The two factories hold only their validation and their steps, and every
  method is tested once, through both.

Validation, in both factories: `cellWidth` and `cellHeight` must be
positive finite numbers.

```
createIsometricGridLayout: cellWidth must be a positive finite number, received 0.
```

## Draw order

**Guarantee.** For both layouts, drawing cells in any order that draws a
cell after every cell whose column and row are both less than or equal to
its own is back to front. Row-major order (rows ascending, then columns
ascending) is such an order. So is chunked row-major order: the grid split
into chunks of a fixed size (any width and height in cells), chunks in
row-major order of their chunk coordinates `(floor(c / k), floor(r / k))`,
and each chunk's cells in row-major order. #812 relies on the chunked form.

**Preconditions.** Each cell's image:

- is at most `cellWidth` wide;
- has its left edge on the left edge of the cell's footprint bounds;
- doesn't reach below the bottom of the footprint bounds. It can reach up
  by any amount.

"In front" means the painter's rule for a top-down or isometric view: of
two cells whose images overlap, the one whose footprint is lower on the
screen (its bounds' bottom has the larger `y`) is in front.

**Proof, orthogonal.** An image spans `[c * w, (c + 1) * w)` horizontally,
so two images overlap with positive area only in the same column. Then the
one in front has the larger row, and the same column: it's greater in both.

**Proof, isometric.** Let `d = c - r` and `s = c + r`. An image spans
`[(d - 1) * w / 2, (d + 1) * w / 2)` horizontally, so two images overlap
only when their `d` differ by at most 1. The footprint's bottom is at
`(s + 2) * h / 2`, so the one in front has the larger `s`. `Δd` and `Δs`
have the same parity, and two different cells can't have both zero, so the
cell in front has `Δs ≥ |Δd|`, which gives `Δc = (Δs + Δd) / 2 ≥ 0` and
`Δr = (Δs - Δd) / 2 ≥ 0`.

**Orders.** If a cell is greater than or equal to another in both column
and row (and not the same cell), it comes later in row-major order (a
larger row, or the same row and a larger column). Its chunk coordinates are
also greater than or equal (`floor` keeps order), so its chunk comes later
or is the same chunk, where row-major order inside the chunk decides.

Images outside the preconditions (wider than a cell, offset sideways,
reaching below the footprint) can draw in the wrong order against their
neighbors. #805 documents that for `textureOrigin`. Staggered and
hexagonal layouts break the guarantee across chunk columns, which is one
reason they're out of scope.

The guarantee is part of the `GridLayout` interface's contract, not a
property of two factories, because #812 only ever sees a `GridLayout`
(decision G4).

## How the consumers use it

| Consumer                     | Members it uses                                                                                                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #805 tile layers             | `getCellCenter` and `localToCell` for `cellToLocal`/`localToCell`; `getCellFootprintBounds` for image placement; `cellWidth`/`cellHeight` as a source's default tile size                    |
| #812 tile rendering          | `getCellFootprintBounds` per cell when a chunk rebuilds; `cellSpaceToLocal` of a chunk's first cell for the chunk entity's position; the draw-order guarantee for triangle and sibling order |
| #825 tile collision          | `getCellPolygon` for `'cell'` shapes and edge splitting; `localToCellSpace`/`cellSpaceToLocal` to flip and transpose shapes in cell space                                                    |
| #839, #871 navigation grids  | `getCellCenter`/`localToCell` for world-cell conversion; `localToCellSpace` to rasterize collider shapes against unit squares; `getCellRangeForLocalRect` to bound the rasterization         |
| Culling, picking (game code) | `getCellRangeForLocalRect(view.bounds)` with a `CameraView`; `localToCell(view.viewportToWorld(mouse))` when the grid's local space is world space                                           |

## Testing

`src/math/grid-layout/test-helpers/grid-layout-contract.ts` exports
`describeGridLayoutContract(name, createLayout)`, a `describe` block of
property tests over a layout. `create-orthogonal-grid-layout.test.ts` and
`create-isometric-grid-layout.test.ts` run it for several cell sizes
(`64 x 32`, `32 x 32`, `30 x 17`, `0.5 x 0.25`), and a later layout reuses
it. It checks:

- **Center round-trip.** `localToCell(getCellCenter(c, r))` is `(c, r)` for
  every cell in `[-5, 5]²`.
- **Ownership.** For every cell in `[-3, 3]²`, each polygon corner and the
  midpoint of each polygon edge lands in exactly the cell the ownership rule
  names, and points nudged by `±1e-6` of a cell across an edge land on the
  right side. This also checks that every point is in one cell, since
  `localToCell` is a function.
- **Cell-space round-trip.** `cellSpaceToLocal(localToCellSpace(p))` is `p`
  within `1e-9` relative for seeded random points, including negative and
  large (`1e6`) ones.
- **Polygon.** Four corners, the first equal to `cellSpaceToLocal(c, r)`,
  `calculateSignedArea` positive, `calculateArea` `w * h` (orthogonal) or
  `w * h / 2` (isometric), and the polygon inside `getCellFootprintBounds`,
  touching each side. (`calculateSignedArea` returns the raw shoelace sum,
  twice the area, so it's only checked for its sign.)
- **Shared corners.** Neighboring cells' shared corners are `===` equal,
  across `0` and at `±1000`.
- **Range, brute force.** For seeded random rects (some zero-size, some on
  cell edges, some negative), every point of a fine sample of the rect,
  edges and corners included, has its `localToCell` inside the range, and
  each bound of the range is reached by some sampled point's cell.
- **Draw order.** For every pair of cells in the 6x6 block `[-3, 2]²` whose
  images, one cell wide and two cells tall, sitting on the bottom-left of
  the footprint bounds, overlap with positive area: their footprints'
  bottoms differ, and the one with the lower footprint comes later in
  row-major order, and in chunked row-major order with chunk sizes `2` and
  `3` (so pairs straddle chunk boundaries, including the one at `0`).
- **Validation.** Each factory throws for `0`, a negative number, `NaN` and
  `Infinity` in either option, and its message names the option and value.
  `localToCell` throws for a non-finite point, and
  `getCellRangeForLocalRect` for a non-finite or inverted rect.
- **No negative zero.** `getCellCenter`, `localToCell` and
  `getCellPolygon` around the origin return `0`, not `-0` (`Object.is`).

Each layout's own test also pins exact values, including the issue's done
condition: `createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 })`
puts cell `(1, 0)`'s center at `(32, 32)` and `localToCell` maps it back to
`(1, 0)`; the orthogonal layout of the same size puts it at `(96, 16)`. The
isometric test lists the polygon of `(0, 0)` (`(0, 0)`, `(32, 16)`,
`(0, 32)`, `(-32, 16)`) and which cell each of its corners belongs to.

The contract suite imports `calculateSignedArea` from
`src/physics/colliders/polygon-math.ts`. That's a test-only import;
`src/math` code doesn't depend on physics.

No e2e test: nothing here touches rendering, input or the game loop. #812's
e2e scene measures isometric overlap on a real canvas.

## Documentation

`documentation-site/docs/docs/math/grid-layouts.md` (`sidebar_position: 6`),
written with the `document-feature` skill, and a line for it in
`math/index.md`. Outline:

- **Grid layouts**: what a layout is, that it's math only (cells are stored
  by tile layers and navigation grids), Y-down columns and rows.
- **Orthogonal layouts**: creating one, the cell rect.
- **Isometric layouts**: creating one, the diamond figure, Tiled's
  orientation, and that Tiled's x offset isn't applied.
- **Finding a cell's position**: `getCellCenter`, `getCellPolygon`,
  `getCellFootprintBounds`.
- **Finding the cell under a point**: `localToCell`, which cell owns an
  edge, picking with `CameraView.viewportToWorld`.
- **Cell space**: the affine map, and mapping a shape into cell space.
- **Cells overlapping a rectangle**: `getCellRangeForLocalRect`, culling
  with `CameraView.bounds`, and why an isometric range holds extra cells.
- **Drawing cells back to front**: the guarantee, its preconditions, and
  the chunked form.

Per-member detail (thrown errors, rounding) goes in JSDoc. The guide links
the tilemap guide once #805 adds it; until then it doesn't mention it.

## Phases

### Phase 1: the `GridLayout` contract and orthogonal layouts

Adds the interface with its full contract, the shared implementation, the
orthogonal factory and the contract test suite. On its own it gives
navigation grids (#776) and game code a tested cell conversion.

**Done when** `createOrthogonalGridLayout` passes the contract suite and its
exact-value tests, everything is exported from
`@forge-game-engine/forge/math`, the guide covers orthogonal layouts and
the draw-order guarantee, and the CLAUDE.md verification steps pass.

| Task                   | Description                                                                                                                                         | Size |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Interface and types    | `grid-layout.ts`: `GridLayout`, `GridCell`, `GridCellRange`, with JSDoc stating Y-down, ownership, cell space, winding and the draw-order guarantee | M    |
| Lattice implementation | `lattice-grid-layout.ts`: the class, its formulas, negative-zero normalization and the `localToCell` and range validation                           | M    |
| Orthogonal factory     | `createOrthogonalGridLayout` and its options type, with validation                                                                                  | S    |
| Contract suite         | `test-helpers/grid-layout-contract.ts` with every property under "Testing", including the brute-force range and draw-order checks                   | L    |
| Orthogonal tests       | Run the suite for each cell size; exact centers, polygons and bounds                                                                                | S    |
| Exports                | `src/math/grid-layout/index.ts` and `src/math/index.ts`; `npm run check-exports`                                                                    | S    |
| Guide                  | `math/grid-layouts.md` without the isometric section, and `math/index.md`                                                                           | M    |
| Changelog              | `#### Added` bullet: `GridLayout` and `createOrthogonalGridLayout`                                                                                  | S    |

### Phase 2: isometric layouts

Adds the diamond layout on the same implementation. It's what #805's
isometric tilesets and #871's isometric navigation grids need.

**Done when** `createIsometricGridLayout` passes the contract suite and its
exact-value tests, including cell `(1, 0)`'s center at `(32, 32)` for a
`64 x 32` layout and back, the guide covers isometric layouts, and the
verification steps pass.

| Task              | Description                                                                                                     | Size |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ---- |
| Isometric factory | `createIsometricGridLayout` and its options type, with validation                                               | S    |
| Isometric tests   | Run the suite for each cell size; the done condition, the `(0, 0)` diamond and the owner of each of its corners | M    |
| Guide             | The "Isometric layouts" section with the figure and the Tiled notes; isometric examples in the other sections   | S    |
| Changelog         | Add `createIsometricGridLayout` to phase 1's bullet if it's unreleased, otherwise a new `#### Added` bullet     | S    |

The `claude` label run can ship both phases in one pull request with one
changelog bullet.

## Decision log

| #   | Decision                                  | Options considered                                                                                                                                                                       | Chosen | Rationale                                                                                                                                                                                                                                                                                                                                                    | Tradeoff                                                                                                                                                                             | Assumptions                                                                            |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| G1  | Shape of the type                         | (a) An interface returned by one factory per layout; (b) a data object with a `kind` field and functions that switch on it; (c) one exported `createGridLayout({ columnStep, rowStep })` | (a)    | Callers never branch on the layout, which AGENTS.md asks for ("no switch statements"), and a layout is added by adding a factory. (b) spreads the switch across every consumer. (c) lets games build skewed grids for which #805's placement rule and the draw-order guarantee don't hold. Same pattern as `StorageBackend` and its factories.               | The interface is wider than the two steps it's computed from.                                                                                                                        | No consumer needs to know which layout it has.                                         |
| G2  | One implementation for both layouts       | (a) One internal class built from two steps; (b) one class per layout with its own formulas                                                                                              | (a)    | Both layouts are linear maps of a square grid, so every method is the same formula. One class means one hidden class at the call sites and one set of tested code.                                                                                                                                                                                           | Orthogonal inverses multiply and divide where `x / w` would do; the result is the same for integer inputs and within one more rounding otherwise.                                    | Future affine layouts (if any) reuse it; non-affine ones get their own implementation. |
| G3  | Where it lives                            | (a) `src/math/grid-layout/`; (b) `src/tilemaps`; (c) a new `grid` module                                                                                                                 | (a)    | Navigation (#775) must not depend on tilemaps, and a layout is plain math like `Rect`. A module of its own for a few files would add an export path for nothing.                                                                                                                                                                                             | `src/math` grows its first non-primitive type.                                                                                                                                       |                                                                                        |
| G4  | Cell space and draw order in the contract | (a) Both are part of the `GridLayout` interface's contract; (b) a narrower sub-interface for layouts that have them; (c) properties of the two factories only                            | (a)    | #812, #825, #839 and #871 only see a `GridLayout` and rely on both, so the type has to promise them. (b) is speculative: no layout without them exists yet. Forge is pre-1.0, so adding staggered or hexagonal layouts later changes the contract and its consumers in that change, as the change philosophy asks, rather than now guessing what it'll need. | The issue's hope that staggered and hexagonal layouts can be added "without changing callers" doesn't hold for consumers that rasterize in cell space or rely on chunked draw order. | Staggered and hexagonal layouts aren't planned in the Tilemaps milestone.              |
| G5  | Results                                   | (a) Return new objects; (b) write into an `out` argument; (c) an optional `out` argument                                                                                                 | (a)    | Matches `Rects.size`, `calculateCentroid` and `CameraView`, and the results are safe to keep (a tileset can hold a cell's polygon). The callers that loop are rebuilds (a chunk mesh, a collision bake), not per-frame work, so the allocation doesn't show. (c) is two APIs in one.                                                                         | A rebuild of a 32 x 32 chunk allocates a few thousand small objects.                                                                                                                 | No consumer calls a layout per cell per frame (open question 2).                       |
| G6  | Integer cells                             | (a) `GridCell { column, row }`; (b) a `Vector2` with `x` as column and `y` as row                                                                                                        | (a)    | Reads as what it is (`const { column, row } = layout.localToCell(p)`) and matches the `column, row` parameters every tile and grid function takes. Continuous cell-space points stay `Vector2`, because consumers do vector maths on them.                                                                                                                   | Two types for cell positions: integer and continuous.                                                                                                                                |                                                                                        |
| G7  | Edge ownership                            | (a) Half-open `[c, c + 1)` in cell space, from `floor`; (b) closed edges with a tie-break                                                                                                | (a)    | One rule for both layouts and any future affine one, and it's what flooring cell-space coordinates gives, the usual approach in tile engines. Multiplying before the one division makes it exact for integer inputs.                                                                                                                                         | Ownership is by cell-space axes, so it's top-left for rectangles and top for diamonds, which the guide has to explain.                                                               |                                                                                        |
| G8  | Range for a rect                          | (a) The smallest cell range holding every cell the rect touches; (b) the exact set as a list or callback                                                                                 | (a)    | A range is what culling and chunk iteration need and costs nothing to compute. The exact set is a rasterization the consumer does in cell space, with its own rules for edges.                                                                                                                                                                               | Isometric ranges hold up to twice the cells the rect reaches.                                                                                                                        |                                                                                        |
| G9  | Validation                                | (a) Factories check cell sizes; cell-returning methods check finiteness; per-cell methods check nothing; (b) check everything; (c) check nothing                                         | (a)    | A bad cell size breaks every later call; a non-finite point or rect has no cell and an infinite range hangs its caller. Integer checks would sit in the inner loops and guard against nothing worse than a well-defined continuous answer.                                                                                                                   | A fractional `column` passes silently.                                                                                                                                               |                                                                                        |
| G10 | Isometric orientation                     | (a) Columns down-right, rows down-left (Tiled `"isometric"`, Godot `DIAMOND_DOWN`); (b) columns up-right (Godot `DIAMOND_RIGHT`; Unity's isometric layout, which is Y-up)                | (a)    | Matches Tiled, so the importer (#836) copies cells straight across, and keeps rows increasing towards `+Y` like the rest of the engine.                                                                                                                                                                                                                      | Games ported from Unity see the map mirrored top to bottom in cell indices.                                                                                                          |                                                                                        |
| G11 | No `kind` or name on a layout             | (a) None; (b) a readonly `kind` for debugging and export                                                                                                                                 | (a)    | A `kind` invites the switch G1 avoids. Nothing in the milestone exports maps.                                                                                                                                                                                                                                                                                | A debugger shows the steps, not "isometric".                                                                                                                                         | A Tiled exporter, if one comes, can be designed then.                                  |

## Open questions

1. **The type's name** (non-blocking). The issue and every consumer issue
   (#805, #812, #825, #839, #871) say `GridLayout`, which is also Unity's
   class name, and `src/ui` already has `GridLayoutGroupEcsComponent`
   (`src/ui/components/layout-group-component.ts`), which lays out UI
   children in a grid. Two "grid layout" ideas in one engine are easy to
   mix up in search results and the API reference.
   - Keep `GridLayout`: the consumers' issues already use it, and "grid
     layout" is a plain description, also used by CSS.
   - Rename to a Forge word with no UI overlap, such as `CellGrid` or
     `GridShape` (`createIsometricCellGrid`), and update the consumer
     issues' text.

   Default: `GridLayout`. A rename changes names only.

2. **New objects or `out` arguments** (non-blocking). Decision G5 returns
   new objects. If a consumer turns out to call a layout per cell every
   frame (a y-sorted tile layer, say), `out` arguments in the style
   `design/3d/02-math.md` (M3) plans for 3D math would avoid the garbage.
   - New objects: simpler, safe to keep, matches today's 2D math.
   - `out` first, as 3D math plans: no allocation, but every caller makes
     scratch vectors.

   Default: new objects. Changing it later changes signatures, not the
   approach.

3. **Move `calculateSignedArea` into `src/math`** (non-blocking). The
   contract suite and #825 need it, and navigation's collider baking
   (#777, #839) will too. It's pure polygon math that happens to live in
   physics.
   - Leave it: a test-only import, and moving polygon math is a refactor of
     its own.
   - Move `polygon-math.ts`'s exports to `src/math` in this change and
     update physics' imports.

   Default: leave it.

4. **A docs-site demo** (non-blocking). CLAUDE.md asks for one with a major
   feature. A layout on its own draws nothing.
   - None now: the tilemap milestone's demo shows orthogonal and isometric
     layers, with picking.
   - A small demo now: an isometric grid drawn with lines, highlighting the
     cell under the mouse and the range under a dragged rectangle.

   Default: none now.
