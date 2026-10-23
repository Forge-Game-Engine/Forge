---
sidebar_position: 2
---

# Navigation grids

A navigation grid is a fixed block of cells, each walkable or blocked and
each with a traversal cost, placed in the world by a
[grid layout](../math/grid-layouts.md). It's a
[`NavigationGraph`](/Forge/docs/api/interfaces/NavigationGraph), so
[`findPath`](./index.md#finding-a-path) can search it, and
[`findGridPath`](/Forge/docs/api/functions/findGridPath) finds a path
between two world positions across it.

## Creating a grid

[`createNavigationGrid`](/Forge/docs/api/functions/createNavigationGrid)
takes the block of cells the grid has, a `GridLayout` and the world
position of the grid's `origin`:

```ts
import { createOrthogonalGridLayout } from '@forge-game-engine/forge/math';
import { createNavigationGrid } from '@forge-game-engine/forge/navigation';

const grid = createNavigationGrid({
  cells: { minColumn: 0, minRow: 0, maxColumn: 39, maxRow: 29 },
  layout: createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 32 }),
  origin: { x: -640, y: -480 },
});
```

`cells` is an inclusive
[`GridCellRange`](/Forge/docs/api/interfaces/GridCellRange) of integer
columns and rows, so this grid has 40 columns and 30 rows. Its bounds can
be negative. `grid.cells` returns the range, and `grid.columns` and
`grid.rows` the number of columns and rows.

Every cell starts walkable, with a cost of `1`. The cells, layout, origin
and [diagonal rule](#diagonal-movement) can't be changed after the grid is
created.

## Cells and world positions

The world is Y-down: columns increase towards `+X` and rows towards `+Y`,
down the screen. `origin` is the world position of cell `(0, 0)`'s corner
at the layout's origin, whether or not the grid has cell `(0, 0)`: the
top-left corner of an orthogonal cell and the top corner of an isometric
one. The layout places every other cell relative to it, so a grid's cells
are at the same world positions as the same cells of a grid with any
other `cells` and the same layout and origin.

- `worldToCell(position)` returns the cell a world position is in, or
  `null` when the position is outside the grid.
- `cellToWorld(column, row)` returns the world position of a cell's
  centre.
- `hasCell(column, row)` checks whether a cell is in the grid.

```ts
const cell = grid.worldToCell({ x: 100, y: 50 });

if (cell !== null) {
  const center = grid.cellToWorld(cell.column, cell.row);
}
```

Every other method that takes a column and row throws for a cell that
isn't in the grid.

## Isometric grids

A grid made with an isometric layout has diamond cells, like an
[isometric tile layer](../tilemaps/isometric-maps.md):

```ts
import { createIsometricGridLayout } from '@forge-game-engine/forge/math';
import { createNavigationGrid } from '@forge-game-engine/forge/navigation';

const grid = createNavigationGrid({
  cells: { minColumn: 0, minRow: 0, maxColumn: 19, maxRow: 19 },
  layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
});
```

`origin` is the top corner of cell `(0, 0)`'s diamond. Columns run down
and to the right on screen, and rows down and to the left. A step between
two cells is a step between their centres, so on diamonds `w` wide and `h`
tall:

| Step                   | Direction on screen    | Length         |
| ---------------------- | ---------------------- | -------------- |
| One column or one row  | Along a diamond's edge | `√(w² + h²)/2` |
| `(1, 1)` or `(-1, -1)` | Straight down or up    | `h`            |
| `(1, -1)` or `(-1, 1)` | Straight right or left | `w`            |

With `'never'`, a path only takes the steps along the diamonds' edges.

## Laying a grid over a tile layer

A grid with a tile layer's layout, its `origin` at the layer's world
position and the layer's used cells as its `cells` has the layer's cells:
grid cell `(c, r)` is layer cell `(c, r)`, at the same world position. The
layer's entity and its parents must not be rotated or scaled, since a grid
has no rotation or scale.

The grid needs the cells units walk on, so it covers the layer that holds
the floor. [`getUsedRect`](/Forge/docs/api/functions/getUsedRect) returns
the cells a layer has tiles in, negative ones included:

```ts
import { positionId } from '@forge-game-engine/forge/common';
import { createNavigationGrid } from '@forge-game-engine/forge/navigation';
import { getUsedRect, tilemapLayerId } from '@forge-game-engine/forge/tilemaps';

const layer = world.getComponent(floor, tilemapLayerId);
const position = world.getComponent(floor, positionId);
const cells = layer ? getUsedRect(layer) : null;

if (!layer || !position || !cells) {
  throw new Error('The floor must be a tile layer with tiles and a position.');
}

const grid = createNavigationGrid({
  cells,
  layout: layer.tileSet.layout,
  origin: position.world,
});
```

`position.world` includes the positions of the layer's parents once the
transform system has run, so create the grid after the first
`world.update()`. When the floor is made of several layers at the same
position, give the grid the smallest range that holds all of their used
rects.

A finite [Tiled map](../tilemaps/loading-tiled-maps.md) has the cells from
`(0, 0)` to `(size.columns - 1, size.rows - 1)` on every layer:

```ts
import { findTiledLayer } from '@forge-game-engine/forge/tilemaps';

const floor = findTiledLayer(spawned, 'Floor').entity;
const floorPosition = world.getComponent(floor, positionId);

if (!map.size || !floorPosition) {
  throw new Error('The map must be finite, with a positioned floor layer.');
}

const grid = createNavigationGrid({
  cells: {
    minColumn: 0,
    minRow: 0,
    maxColumn: map.size.columns - 1,
    maxRow: map.size.rows - 1,
  },
  layout: map.tileSet.layout,
  origin: floorPosition.world,
});
```

An infinite Tiled map has no `size`, so use the floor layers' used rects
for it. A layer with its own offset in Tiled is at a different world
position from the others, so a grid only has the cells of the layers at
its `origin`.

The grid doesn't follow the layer: when the layer moves, create a new
grid. To block the cells of the layer's solid tiles, bake the layer's
collider into the grid (see
[Blocking cells from colliders](./colliders.md)). To set cell costs from
the layer's tiles, see
[Navigation over tile layers](../tilemaps/navigation.md).

## Blocking cells

`setWalkable(column, row, walkable)` makes one cell walkable or blocked,
and `fillWalkable(range, walkable)` does the same for an inclusive
`GridCellRange` of cells:

```ts
grid.setWalkable(4, 7, false);
grid.fillWalkable(
  { minColumn: 10, minRow: 5, maxColumn: 10, maxRow: 20 },
  false,
);
```

The part of a range outside the grid is ignored. `isWalkable(column, row)`
reads a cell's walkability. A path never enters a blocked cell.

`fillWalkableMask(mask, walkable)` makes many cells walkable or blocked in
one call. `mask` is a `Uint8Array` with one byte per cell, indexed by node
id (see [Searching a grid with findPath](#searching-a-grid-with-findpath)),
and every cell whose byte isn't `0` is written:

```ts
const mask = new Uint8Array(grid.nodeCount);

mask[grid.cellToNode(4, 7)] = 1;
mask[grid.cellToNode(5, 7)] = 1;

grid.fillWalkableMask(mask, false);
```

It throws when `mask.length` isn't `grid.nodeCount`. To block the cells
your level's colliders cover, see
[Blocking cells from colliders](./colliders.md).

## Setting cell costs

A cell's cost multiplies the cost of every step into it, so a path avoids
expensive cells when going around them is cheaper. `setCost(column, row,
cost)` sets one cell's cost and `fillCost(range, cost)` a range's:

```ts
grid.fillCost({ minColumn: 0, minRow: 12, maxColumn: 39, maxRow: 14 }, 3);
grid.setCost(20, 13, 0.5);
```

A cost is stored as a 32-bit float and must be finite and more than `0`.
`getCost(column, row)` reads it. A blocked cell keeps its cost, so making
it walkable again restores it.

`setCosts(costs)` sets every cell's cost in one call. `costs` is a
`Float32Array` with one cost per cell, indexed by node id (see
[Searching a grid with findPath](#searching-a-grid-with-findpath)):

```ts
const costs = new Float32Array(grid.nodeCount).fill(1);

costs[grid.cellToNode(20, 13)] = 0.5;

grid.setCosts(costs);
```

It throws, and changes no cell, when `costs.length` isn't
`grid.nodeCount` or an entry isn't finite and more than `0`. To set costs
from a tile layer's tiles, see
[Navigation over tile layers](../tilemaps/navigation.md).

## Diagonal movement

A path moves from a cell to one of the four cells beside it, and with
diagonal movement also to the four cells at its corners. The `diagonals`
option of `createNavigationGrid` chooses which diagonal steps are allowed:

| `diagonals`         | Steps                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `'never'`           | Only to the four cells beside a cell.                                                                   |
| `'always'`          | To any of the eight cells around a cell that's walkable.                                                |
| `'noCornerCutting'` | Like `'always'`, but a diagonal step is only allowed when both cells beside it are walkable. (Default.) |

With `'noCornerCutting'`, a path doesn't pass diagonally between a blocked
cell and the cell beside it, so a unit following it doesn't clip the
corner of a wall:

```text
A #     The diagonal step from A to B passes between the blocked
. B     cell # and the cell below A. 'always' allows it,
        'noCornerCutting' doesn't.
```

The cells beside a cell are the cells one column or one row away on every
layout. On an isometric layout they're across its diamond's edges (see
[Isometric grids](#isometric-grids)).

## Path costs

A step costs the cost of the cell it enters times the world distance
between the two cells' centres. A path's cost is therefore its length in
world units, weighted by the costs of the cells it enters, and the
cheapest path is the shortest one in the world when every cell costs the
same. On square cells of size `s`, an orthogonal step costs `s` times the
cell's cost and a diagonal step costs `s√2` times it. On an isometric
layout the steps have the lengths in [Isometric grids](#isometric-grids).

The grid's heuristic is the cost of the shortest path between two cells
on the same grid with no blocked cells and every cell at the grid's lowest
cost. On square cells that's Manhattan distance with `'never'` and octile
distance otherwise, times the cell size. It never overestimates, so
`findPath` returns the cheapest path.

## Finding a path between world positions

`findGridPath(grid, fromWorld, toWorld)` finds the cheapest path from the
cell `fromWorld` is in to the cell `toWorld` is in:

```ts
import { findGridPath } from '@forge-game-engine/forge/navigation';

const result = findGridPath(grid, unitPosition, targetPosition);

if (result.status === 'found') {
  for (const point of result.points) {
    // Each point is the world position of a cell centre on the path.
  }
}
```

The [result](/Forge/docs/api/interfaces/FindGridPathResult) has everything
`findPath` returns (`status`, `nodes`, `cost` and `expanded`, see
[Path statuses](./index.md#path-statuses)) and:

- `points`: the world position of the centre of each cell in `nodes`, in
  the same order.
- `startCell` and `goalCell`: the cells the search ran between.
- `startSnapped` and `goalSnapped`: whether those cells are different from
  the cells the two positions are in (see the next section).

`findGridPath` takes `findPath`'s `maxExpanded` option.

### Blocked and outside positions

A start or goal in a blocked cell, or outside the grid, is moved to a
walkable cell near it before the search runs, and the result's
`startSnapped` or `goalSnapped` is `true`:

- A position outside the grid starts from the cell on the grid's edge
  nearest it.
- The cells around that cell are searched one ring at a time, up to
  `snapRadius` rings out (`2` by default). In the first ring that has a
  walkable cell, the cell whose centre is nearest the position is used.

```ts
const result = findGridPath(grid, unitPosition, targetPosition, {
  snapRadius: 4,
});
```

When there's no walkable cell within `snapRadius` rings, the cell stays
where it is. A goal in a blocked cell can't be reached, so the result is
`'unreachable'` (or `'limitReached'`), with a path towards it. A start in
a blocked cell can still step into a walkable cell beside it.

## Smoothing a path

A path from `findGridPath` goes from cell centre to cell centre, so a unit
following it zig-zags in grid-aligned steps.
[`smoothGridPath`](/Forge/docs/api/functions/smoothGridPath) removes
every point the unit can skip by walking in a straight line:

```ts
import {
  findGridPath,
  smoothGridPath,
} from '@forge-game-engine/forge/navigation';

const result = findGridPath(grid, unitPosition, targetPosition);
const waypoints = smoothGridPath(grid, result.points);
```

It keeps the first point. From each point it keeps, it keeps the farthest
later point it has a shortcut to and drops the points in between. A
shortcut is a straight segment that's in
[line of sight](#line-of-sight) and costs no more than the stretch of
path it replaces. A path across an open room becomes one straight
segment, and a path around a wall keeps a point at each corner it turns.
The last point is always kept. It returns a new array of new points and
leaves the path alone.

A segment costs its length in each cell it crosses times that cell's
cost, added up. So a path that went around mud keeps going around it,
because cutting through the mud would cost more, while a path that has
to cross a river can still be straightened across it. On a grid where
every cell costs the same, a straight segment never costs more than the
path it replaces, so only line of sight decides.

Smoothing is a separate step, so a turn-based game that moves cell by
cell keeps the raw path, and a real-time game smooths it.

### Line of sight

[`hasLineOfSight(grid, fromWorld, toWorld)`](/Forge/docs/api/functions/hasLineOfSight)
checks whether a unit can walk in a straight line between two world
positions. It's `true` when every cell the segment touches is in the grid
and walkable:

```ts
import { hasLineOfSight } from '@forge-game-engine/forge/navigation';

if (hasLineOfSight(grid, unitPosition, targetPosition)) {
  // Walk straight to the target.
}
```

A cell counts when the segment touches any part of it, its edges and
corners included. A segment through the exact corner where four cells
meet needs all four to be walkable, so a smoothed path never clips the
corner of a wall:

```text
A #     The segment from A to B passes through the corner between
# B     the two blocked cells #, so it isn't in line of sight. With
        only one of them blocked, it still isn't.
```

The check works the same on orthogonal and isometric grids.

## Searching a grid with findPath

A grid's node ids number its cells row by row from its first cell,
`(row - cells.minRow) * columns + (column - cells.minColumn)`, from `0` to
`nodeCount - 1`. `cellToNode(column, row)` and `nodeToCell(node)` convert
between the two, so a grid can be searched with `findPath` directly:

```ts
import { findPath } from '@forge-game-engine/forge/navigation';

const result = findPath(grid, grid.cellToNode(2, 3), grid.cellToNode(30, 25));
const cells = result.nodes.map((node) => grid.nodeToCell(node));
```

## Detecting changes

A grid's `version` starts at `0` and increases by one after each call to
`setWalkable`, `setCost`, `fillWalkable`, `fillWalkableMask`, `fillCost`
or `setCosts` that changes at least one cell. Comparing it with the version a path was found at tells
whether the grid has changed since:

```ts
const pathVersion = grid.version;

// Later:
if (grid.version !== pathVersion) {
  // Find the path again.
}
```

A call that changes nothing, such as making a walkable cell walkable,
leaves `version` the same.
