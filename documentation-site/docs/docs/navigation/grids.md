---
sidebar_position: 2
---

# Navigation grids

A navigation grid is a fixed-size block of cells, each walkable or blocked
and each with a traversal cost, placed in the world by a
[grid layout](../math/grid-layouts.md). It's a
[`NavigationGraph`](/Forge/docs/api/interfaces/NavigationGraph), so
[`findPath`](./index.md#finding-a-path) can search it, and
[`findGridPath`](/Forge/docs/api/functions/findGridPath) finds a path
between two world positions across it.

## Creating a grid

[`createNavigationGrid`](/Forge/docs/api/functions/createNavigationGrid)
takes the number of columns and rows, a `GridLayout` and the world
position of the grid's `origin`:

```ts
import { createOrthogonalGridLayout } from '@forge-game-engine/forge/math';
import { createNavigationGrid } from '@forge-game-engine/forge/navigation';

const grid = createNavigationGrid({
  columns: 40,
  rows: 30,
  layout: createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 32 }),
  origin: { x: -640, y: -480 },
});
```

Every cell starts walkable, with a cost of `1`. The size, layout, origin
and [diagonal rule](#diagonal-movement) can't be changed after the grid is
created.

## Cells and world positions

The world is Y-down: columns increase towards `+X` and rows towards `+Y`,
down the screen. `origin` is the world position of cell `(0, 0)`'s corner
at the layout's origin: the top-left corner of an orthogonal cell and the
top corner of an isometric one. A grid with the same layout as a tile
layer whose entity isn't rotated or scaled, and its `origin` at the
layer's world position, has the same cells as the layer.

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

## Blocking cells

`setWalkable(column, row, walkable)` makes one cell walkable or blocked,
and `fillWalkable(range, walkable)` does the same for an inclusive
[`GridCellRange`](/Forge/docs/api/interfaces/GridCellRange) of cells:

```ts
grid.setWalkable(4, 7, false);
grid.fillWalkable(
  { minColumn: 10, minRow: 5, maxColumn: 10, maxRow: 20 },
  false,
);
```

The part of a range outside the grid is ignored. `isWalkable(column, row)`
reads a cell's walkability. A path never enters a blocked cell.

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

On an isometric layout the four cells beside a cell are the cells across
its diamond's edges, so with `'never'` a path moves diagonally across the
screen.

## Path costs

A step costs the cost of the cell it enters times the world distance
between the two cells' centres. On square cells of size `s`, an
orthogonal step costs `s` times the cell's cost and a diagonal step costs
`s√2` times it. A path's cost is therefore its length in world units,
weighted by the costs of the cells it enters.

The grid's heuristic is the cost of the shortest path between two cells
on the same grid with no blocked cells and every cell at the grid's lowest
cost: Manhattan distance with `'never'`, and octile distance otherwise, on
square cells. It never overestimates, so `findPath` returns the cheapest
path.

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

## Searching a grid with findPath

A grid's node ids are its cell indices, `row * columns + column`.
`cellToNode(column, row)` and `nodeToCell(node)` convert between the two,
so a grid can be searched with `findPath` directly:

```ts
import { findPath } from '@forge-game-engine/forge/navigation';

const result = findPath(grid, grid.cellToNode(2, 3), grid.cellToNode(30, 25));
const cells = result.nodes.map((node) => grid.nodeToCell(node));
```

## Detecting changes

A grid's `version` starts at `0` and increases by one after each call to
`setWalkable`, `setCost`, `fillWalkable` or `fillCost` that changes at
least one cell. Comparing it with the version a path was found at tells
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
