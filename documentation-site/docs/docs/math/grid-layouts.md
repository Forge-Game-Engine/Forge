---
sidebar_position: 6
---

# Grid Layouts

A [`GridLayout`](/Forge/docs/api/interfaces/GridLayout) says where each cell
of an unbounded grid is: it converts a cell's column and row to a position
and a position to the cell that contains it. It holds no cells. Code that
stores cells, such as a [tilemap layer](../tilemaps/index.md) or a
navigation grid, takes a layout to place them, so two of them made with the
same layout agree on every cell.

Positions are in the local space of whatever uses the layout. Like the rest
of the engine it's Y-down: columns increase towards `+X` and rows towards
`+Y`, down the screen.

## Layout types

Forge has two layouts. Both are created from a cell size and implement the
same `GridLayout` interface, so code that takes a layout works with either.

### Orthogonal layouts

[`createOrthogonalGridLayout`](/Forge/docs/api/functions/createOrthogonalGridLayout)
creates a grid of rectangles, `cellWidth` by `cellHeight`:

```ts
import { createOrthogonalGridLayout } from '@forge-game-engine/forge/math';

const layout = createOrthogonalGridLayout({ cellWidth: 32, cellHeight: 32 });
```

Cell `(column, row)` is the rectangle from
`(column * cellWidth, row * cellHeight)` to
`((column + 1) * cellWidth, (row + 1) * cellHeight)`.

### Isometric layouts

[`createIsometricGridLayout`](/Forge/docs/api/functions/createIsometricGridLayout)
creates a grid of diamonds, `cellWidth` wide and `cellHeight` tall. A 2:1
isometric tile is `64` by `32`:

```ts
import { createIsometricGridLayout } from '@forge-game-engine/forge/math';

const layout = createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 });
```

Moving one column goes down and to the right, and moving one row goes down
and to the left. Cell `(column, row)` is the diamond whose top corner is at
`((column - row) * cellWidth / 2, (column + row) * cellHeight / 2)`, so cell
`(0, 0)`'s top corner is at the origin:

```
            /\
           /  \
          / 0,0\
         /\    /\
        /  \  /  \
       / 0,1\/1,0 \
      /\    /\    /\
     /  \  /  \  /  \
    / 0,2\/1,1 \/2,0 \
```

This is the `"isometric"` orientation of a Tiled map, with the same columns
and rows. Tiled also shifts a map to the right by
`mapHeight * tileWidth / 2` pixels so that every cell has a positive x; a
`GridLayout` has no such shift.

## Finding a cell's position

[`getCellCenter(column, row)`](/Forge/docs/api/interfaces/GridLayout#getcellcenter)
returns the center of a cell:

```ts
const layout = createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 });

layout.getCellCenter(1, 0); // { x: 32, y: 32 }
```

A cell's footprint is the area it covers: a rectangle in an orthogonal
layout and a diamond in an isometric one.
[`getCellPolygon(column, row)`](/Forge/docs/api/interfaces/GridLayout#getcellpolygon)
returns the footprint's four corners, clockwise on screen, starting at the
top-left corner of a rectangle or the top corner of a diamond. Neighboring
cells' shared corners are equal.
[`getCellFootprintBounds(column, row)`](/Forge/docs/api/interfaces/GridLayout#getcellfootprintbounds)
returns the footprint's axis-aligned bounds as a
[`Rect`](/Forge/docs/api/interfaces/Rect),
`cellWidth` wide and `cellHeight` tall.

## Finding the cell that contains a point

[`localToCell(point)`](/Forge/docs/api/interfaces/GridLayout#localtocell)
returns the column and row of the cell that contains a point, including
negative cells:

```ts
layout.localToCell({ x: 32, y: 32 }); // { column: 1, row: 0 }
layout.localToCell({ x: -40, y: 10 }); // { column: -1, row: 0 }
```

A point on an edge or corner shared by several cells is in exactly one of
them. An orthogonal cell contains its top and left edges and its top-left
corner. An isometric cell contains its top-left and top-right edges and its
top corner.

When the layout's local space is the world, the cell under the mouse is the
cell that contains the mouse's world position, from a
[`CameraView`](../rendering/world-units-and-cameras.md#what-a-camera-sees):

```ts
const view = getCameraView(world, camera, renderContext);
const cell = layout.localToCell(view.viewportToWorld(mouse.position));
```

## Cell space

Cell space is a coordinate space in which cell `(column, row)` is the unit
square from `(column, row)` to `(column + 1, row + 1)`, for both layouts.
[`localToCellSpace(point)`](/Forge/docs/api/interfaces/GridLayout#localtocellspace)
converts a point from local space to cell space, and
[`cellSpaceToLocal(point)`](/Forge/docs/api/interfaces/GridLayout#cellspacetolocal)
converts it back:

```ts
layout.localToCellSpace({ x: 32, y: 32 }); // { x: 1.5, y: 0.5 }
layout.cellSpaceToLocal({ x: 1.5, y: 0.5 }); // { x: 32, y: 32 }
```

The conversion is linear, so a straight line in local space is a straight
line in cell space and a polygon keeps its winding. Converting each vertex
of a polygon gives the polygon in cell space, where the cells it covers are
the unit squares it overlaps. The same code then works for both layouts.

## Finding the cells that overlap a rectangle

[`getCellRangeForLocalRect(rect)`](/Forge/docs/api/interfaces/GridLayout#getcellrangeforlocalrect)
returns the smallest range of columns and rows that holds every cell
containing a point of the rectangle. Both ends of each range are included:

```ts
const { bounds } = getCameraView(world, camera, renderContext);
const range = layout.getCellRangeForLocalRect(bounds);

for (let row = range.minRow; row <= range.maxRow; row++) {
  for (let column = range.minColumn; column <= range.maxColumn; column++) {
    // The cell at (column, row) might be visible.
  }
}
```

:::note
In an isometric layout the cells that overlap a rectangle form a diamond of
columns and rows, so the range also holds cells outside the rectangle. To
find exactly the cells it overlaps, convert the rectangle's corners into
cell space and test the unit squares there.
:::

## Drawing cells back to front

Drawing cells in row-major order, every cell of row `0` from the lowest
column to the highest, then row `1`, and so on, draws them back to front
in both layouts: of two cells whose images overlap, the one whose footprint
is lower on the screen is drawn later.

```ts
for (let row = range.minRow; row <= range.maxRow; row++) {
  for (let column = range.minColumn; column <= range.maxColumn; column++) {
    // Draw the cell at (column, row).
  }
}
```

The grid can also be split into square chunks of a fixed size and drawn
chunk by chunk, with the chunks in row-major order of their chunk column and
chunk row and each chunk's cells in row-major order.

:::caution
The order is back to front when each cell's image:

- is at most `cellWidth` wide,
- has its left edge on the left edge of the cell's footprint bounds,
- doesn't reach below the bottom of the footprint bounds.

An image can reach above its cell by any height. An image that is wider,
offset to the side or reaching below its footprint can draw over a cell in
front of it.
:::
