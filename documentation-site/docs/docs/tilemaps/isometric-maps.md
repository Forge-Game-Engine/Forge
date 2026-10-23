---
sidebar_position: 7
---

# Isometric maps

An isometric map is a tilemap whose tile set has an isometric
[grid layout](../math/grid-layouts.md#isometric-layouts): every cell is a
diamond, and tiles taller than a cell stand on it. Layers, the cell
functions, rendering, collision and the Tiled loader work the same as for an
orthogonal map. This page covers what an isometric map needs on top: tall
tiles, y-sorting them with characters, colliding with their bases and
picking cells with the mouse.

The [isometric tilemap demo](/Forge/demos/isometric-tilemap) loads an
isometric Tiled map and uses each of these.

## Choosing a layout

A tile set's layout decides where every cell is.
[`createIsometricGridLayout`](/Forge/docs/api/functions/createIsometricGridLayout)
lays cells out as diamonds `cellWidth` wide and `cellHeight` tall, with a
column going down and to the right and a row going down and to the left.
A 2:1 isometric cell is `64` by `32`:

```ts
import { createIsometricGridLayout } from '@forge-game-engine/forge/math';
import { createTileSet } from '@forge-game-engine/forge/tilemaps';

const tileSet = createTileSet({
  layout: createIsometricGridLayout({ cellWidth: 64, cellHeight: 32 }),
  sources: [{ atlas: floorAtlas }],
});
```

A Tiled map whose orientation is "Isometric" loads with an isometric layout
whose cell size is the map's tile size (see
[Loading Tiled maps](./loading-tiled-maps.md#what-a-loaded-map-holds)).
Its object positions are converted to the layout's space (see
[Objects in isometric maps](./loading-tiled-maps.md#objects-in-isometric-maps)).

## Tall tiles and `textureOrigin`

A wall or a tree is a tile whose image is taller than its cell. A source
whose tiles are taller sets its own `tileHeight`, and each tile's image is
placed with its bottom-left corner on the bottom-left corner of its cell's
footprint bounds, so it reaches up over the cells behind it (see
[Tile image placement](./tile-sets.md#tile-image-placement)):

```ts
const wallSource = {
  atlas: createGridTextureAtlas(wallTexture, { cellWidth: 64, cellHeight: 96 }),
  tileHeight: 96,
};
```

Art whose base diamond is at the bottom of its image, as wide as the image,
needs nothing more. A tile's `textureOrigin` moves its image from there,
Y-down, for art whose base is elsewhere in its image. A Tiled tileset's
`tileoffset` becomes the `textureOrigin` of every tile in it.

:::caution
Cells draw back to front when each tile's image stays inside the limits in
[Tile image placement](./tile-sets.md#tile-image-placement): at most a cell
wide, with a `textureOrigin.x` of `0` and a `textureOrigin.y` of `0` or
less. A y-sorted layer draws its rows in ascending sort Y and each row's
tiles in row-major cell order, so the same limits apply to its tiles.
:::

## Y-sorting walls with characters

A layer that isn't y-sorted sorts against sprites as one unit, so a
character is in front of every wall in it or behind every wall. A
y-sorted layer draws one sort row of cells at a time, and under a camera
with `ySort`, a character draws behind the rows below its sort point on
screen and in front of the rows above it (see
[Y-sorting tiles with characters](./rendering.md#y-sorting-tiles-with-characters)).

### Choosing the layers to y-sort

Y-sort the layers with tiles that stand up from the floor and that a
character walks behind and in front of: walls, trees and props. Leave floor
layers unsorted, and give them a lower `DrawOrderEcsComponent` `order` than
everything else, so they draw behind everything whatever its Y:

```ts
import {
  addCameraComponent,
  addDrawOrderComponent,
} from '@forge-game-engine/forge/rendering';

addCameraComponent(world, camera, { ySort: true });
addDrawOrderComponent(world, floor, { order: -1 });
addDrawOrderComponent(world, walls, { ySortChildren: true });
```

A floor is under everything that stands on it, so sorting its rows changes
nothing that's drawn, and a layer that isn't y-sorted draws in fewer calls
(see [Draw calls of y-sorted layers](#draw-calls-of-y-sorted-layers)).

### Setting `ySortChildren` from the root

A layer's rows sort against a character only when the layer entity and
every ancestor of it set `ySortChildren` (see
[Y-sorting an entity's children](../rendering/draw-order.md#y-sorting-an-entitys-children)).
For a map built by hand, set it on the map's root and on each y-sorted
layer:

```ts
addDrawOrderComponent(world, map, { ySortChildren: true });
addDrawOrderComponent(world, walls, { ySortChildren: true });
world.setParent(walls, map);
```

`spawnTiledMap` sets it on the map's root and every group layer, so a
spawned map only sets it on the layers to y-sort (see
[Y-sorting a layer](./loading-tiled-maps.md#y-sorting-a-layer)).

A character with a dynamic or kinematic rigid body is a root entity (see
[Drawing a character between layers](./rendering.md#drawing-a-character-between-layers)),
and every root is a sort unit, so it sorts against the map's rows by its
own Y.

### Choosing where tiles and characters sort

In an isometric layout, a sort row is the cells with the same
`column + row`, a horizontal line on screen. A tile sorts at the Y of its
cell's center plus its `ySortOrigin`, in the layer's local units (see
[Where a tile sorts](./rendering.md#where-a-tile-sorts)). A wall that fills
its cell sorts at the center of its footprint with the default `0`. A tile
whose sort line is elsewhere sets `ySortOrigin` in its source's `tiles`:

```ts
const propSource = {
  atlas: propAtlas,
  tileHeight: 96,
  tiles: new Map([[2, { ySortOrigin: 8 }]]),
};
```

The Tiled loader leaves every tile's `ySortOrigin` at `0`, since a Tiled
tile has no sort origin.

A character sorts at its entity's position. Put the position at its feet,
with its sprite's `pivot` at the bottom of its image, so it sorts at the
point where it stands:

```ts
import { addSpriteComponent } from '@forge-game-engine/forge/rendering';

addSpriteComponent(world, character, {
  ...characterSprite,
  pivot: { x: 0.5, y: 1 },
});
```

A character whose position is elsewhere sets `ySortOrigin` on its own
`DrawOrderEcsComponent` instead (see
[Choosing where an entity sorts](../rendering/draw-order.md#choosing-where-an-entity-sorts)).

## Colliding with tile bases

A tile's collision shape is in tile-local space: the origin is the center
of the cell's footprint, and the shape stays inside the footprint, whatever
the size of the tile's image. A tall wall collides with the diamond it
stands on, not with its image. `'cell'` is the whole diamond, and a convex
polygon is part of it, such as a tree trunk's base (see
[Collision shapes](./collision.md#collision-shapes)):

```ts
const wallSource = {
  atlas: wallAtlas,
  tileHeight: 96,
  tiles: new Map([
    [0, { collision: 'cell' }],
    [
      1,
      {
        collision: [
          { x: -8, y: 0 },
          { x: 0, y: -4 },
          { x: 8, y: 0 },
          { x: 0, y: 4 },
        ],
      },
    ],
  ]),
};
```

The layer's collider outlines the union of these shapes, so a row of walls
is one outline of diamonds. In Tiled, a collision shape is measured on the
tile's image, unless the tileset's collision grid is isometric, and is
clipped to the footprint, so a rectangle over a whole wall
image becomes `'cell'` (see
[Tile collision shapes](./loading-tiled-maps.md#tile-collision-shapes)).

A character that walks among the walls collides with a body at its feet,
the part of it that stands on the floor. A
[`CircleCollider`](/Forge/docs/api/classes/CircleCollider) centered at its
position slides along the diamonds' edges and around their corners.

## Picking the cell under the mouse

[`worldToCell`](/Forge/docs/api/functions/worldToCell) returns the cell
whose diamond holds a world point, and
[`cellToWorld`](/Forge/docs/api/functions/cellToWorld) returns the center
of a cell's diamond in world space. To pick a cell with the mouse, convert
the pointer to world space with a
[`CameraView`](../rendering/world-units-and-cameras.md#what-a-camera-sees),
then to a cell, and place a highlight sprite at the cell's center:

```ts
import { getCameraView } from '@forge-game-engine/forge/rendering';
import { cellToWorld, worldToCell } from '@forge-game-engine/forge/tilemaps';

const view = getCameraView(world, camera, renderContext);
const worldPoint = view.viewportToWorld(mouse.position);
const { column, row } = worldToCell(world, walls, worldPoint);
const center = cellToWorld(world, walls, column, row);

highlightPosition.local.x = center.x;
highlightPosition.local.y = center.y;
```

The highlight above is a root entity, so its local position is in world
space. A cell-sized diamond image centered on it outlines the cell.

:::note
The picked cell is the one whose footprint holds the point, not the tile
drawn there. A point on the upper part of a tall wall's image is in a cell
behind the wall.
:::

A system that sets or clears tiles in the picked cell runs before the
tilemap systems, so the tile draws, sorts and collides on the tick it's
changed (see [Registering the tilemap systems](./index.md#registering-the-tilemap-systems)).

## Finding paths across the map

A [navigation grid](../navigation/grids.md) made with the tile set's
layout, its `origin` at the floor layer's world position and the floor's
cells has the same diamonds as the layer, by number and by position (see
[Laying a grid over a tile layer](../navigation/grids.md#laying-a-grid-over-a-tile-layer)).
[`markGridFromColliders`](../navigation/colliders.md) blocks the cells of
the walls' collision shapes,
[`applyTilemapNavigationCosts`](./navigation.md#applying-tile-costs-to-a-grid)
sets each diamond's cost from the floor tile's `navigationCost`, and
`findGridPath` returns paths through the centres of the open diamonds. The
[Isometric Path Finding demo](/Forge/demos/isometric-path-finding) draws
one.

## Draw calls of y-sorted layers

A layer that isn't y-sorted draws one call per chunk and source on screen.
A y-sorted layer draws one call per visible run of a source's rows, plus
one more each time a character or another sort unit sorts between two rows.
A y-sorted layer whose tiles come from more than one source draws a call
each time the source changes along the sort order, so keep each y-sorted
layer's tiles in one source (see
[Draw calls and culling](./rendering.md#draw-calls-and-culling)).

An edit to a y-sorted layer rebuilds the whole geometry of each source it
touches, in time proportional to that source's tiles in the layer (see
[Editing a y-sorted layer](./rendering.md#editing-a-y-sorted-layer)). Large
floors and layers whose tiles change every frame are layers that aren't
y-sorted.
