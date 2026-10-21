---
sidebar_position: 2
---

# Layers

A tilemap layer is one entity with a
[`TilemapLayerEcsComponent`](/Forge/docs/api/interfaces/TilemapLayerEcsComponent):
a [tile set](./tile-sets.md) and a [packed tile](./tile-sets.md#packed-tiles)
per cell, stored in chunks. The cell functions on this page write and read
its cells, and the systems that draw it and collide with it read them.

## Layers and maps

[`addTilemapLayerComponent`](/Forge/docs/api/functions/addTilemapLayerComponent)
adds an empty layer to an entity. The entity's transform places the layer:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { addTilemapLayerComponent } from '@forge-game-engine/forge/tilemaps';

const ground = world.createEntity();

addPositionComponent(world, ground);

const groundLayer = addTilemapLayerComponent(world, ground, { tileSet });
```

`tintColor`, `category` and `layer` mean what they mean on a sprite (see
[Tint, category and draw layer](./rendering.md#tint-category-and-draw-layer)).

A map with several layers is a root entity with one child entity per
layer. Later siblings draw on top of earlier ones, and
`DrawOrderEcsComponent` sorts a layer between other things, as for any
entity (see [Drawing layers with sprites](./rendering.md#drawing-layers-with-sprites)):

```ts
const map = world.createEntity();

addPositionComponent(world, map);

for (const layerTileSet of [groundTileSet, wallTileSet]) {
  const layerEntity = world.createEntity();

  addPositionComponent(world, layerEntity);
  addTilemapLayerComponent(world, layerEntity, { tileSet: layerTileSet });
  world.setParent(layerEntity, map);
}
```

[Loading Tiled maps](./loading-tiled-maps.md) builds this hierarchy from a
map made in Tiled.

### Chunks

A layer has no size. Cells are stored in chunks of
[`tilemapChunkSize`](/Forge/docs/api/variables/tilemapChunkSize) by
`tilemapChunkSize` cells, created when a tile is written into them and
removed when their last tile is cleared, so any cell from `-2^30` to
`2^30 - 1` on each axis can hold a tile, including negative cells.

## Editing a layer

The cell functions are the only code that writes a layer's cells. Every
function that takes a tile throws, without changing the layer, for a value
that isn't a packed tile, or a tile whose source or tile index the layer's
tile set doesn't have.

### Setting and clearing a tile

[`setTile`](/Forge/docs/api/functions/setTile) writes one cell, and
[`clearTile`](/Forge/docs/api/functions/clearTile) empties one:

```ts
import { clearTile, setTile } from '@forge-game-engine/forge/tilemaps';

setTile(groundLayer, 3, -2, grass);
clearTile(groundLayer, 3, -2);
```

Setting a cell to `emptyTile` also empties it.

### Filling a rectangle

[`fillTiles`](/Forge/docs/api/functions/fillTiles) writes one tile into a
rectangle of cells, given its top-left cell and its size in columns and
rows.
[`clearTiles`](/Forge/docs/api/functions/clearTiles) empties every cell of
a layer:

```ts
import { clearTiles, fillTiles } from '@forge-game-engine/forge/tilemaps';

fillTiles(groundLayer, -10, -10, 20, 20, grass);
clearTiles(groundLayer);
```

Filling with `emptyTile` clears the rectangle.

### Writing a block of tiles

[`setTileBlock`](/Forge/docs/api/functions/setTileBlock) writes a
rectangle of different tiles from a row-major array, given its top-left
cell and its size in columns and rows. `tiles[r * columns + c]` goes to the
cell `(column + c, row + r)`:

```ts
import { emptyTile, setTileBlock } from '@forge-game-engine/forge/tilemaps';

const topRow = [grass, grass, grass];
const bottomRow = [grass, emptyTile, grass];

setTileBlock(groundLayer, 4, 2, 3, 2, [...topRow, ...bottomRow]);
```

An `emptyTile` entry clears its cell. The array's length must be
`columns * rows`. Like `fillTiles`, the whole block is one change to the
layer (see [Reacting to changes](#reacting-to-changes)).

### Reading a tile and its data

[`getTile`](/Forge/docs/api/functions/getTile) returns a cell's packed tile,
or `emptyTile`.
[`getTileData`](/Forge/docs/api/functions/getTileData) returns a tile's
`TileData`, and throws for `emptyTile`:

```ts
import {
  emptyTile,
  getTile,
  getTileData,
} from '@forge-game-engine/forge/tilemaps';

const tile = getTile(groundLayer, column, row);

if (tile !== emptyTile) {
  const isWater = getTileData(groundLayer.tileSet, tile).properties.water;
}
```

### Visiting every tile

[`forEachTile`](/Forge/docs/api/functions/forEachTile) calls a function for
every non-empty cell, chunk by chunk in row-major order of the chunks, and
row-major within each chunk. That order draws cells back to front.
[`getUsedRect`](/Forge/docs/api/functions/getUsedRect) returns the range of
cells that holds every tile, or `null` for an empty layer:

```ts
import { forEachTile, getUsedRect } from '@forge-game-engine/forge/tilemaps';

forEachTile(groundLayer, (column, row, tile) => {
  // Use the tile at (column, row).
});

const usedCells = getUsedRect(groundLayer);
```

The function passed to `forEachTile` must not change the layer.
`getUsedRect` reads every stored cell.

### Replacing the tile set

[`setTileSet`](/Forge/docs/api/functions/setTileSet) gives a layer another
tile set, which can have a different layout. It throws, without changing
the layer, if a stored tile names a source or tile index the new tile set
doesn't have:

```ts
import { setTileSet } from '@forge-game-engine/forge/tilemaps';

setTileSet(groundLayer, winterTileSet);
```

## Finding cells

### Converting between cells and layer space

[`cellToLocal`](/Forge/docs/api/functions/cellToLocal) returns the center
of a cell's footprint in the layer's local space, and
[`localToCell`](/Forge/docs/api/functions/localToCell) returns the cell
that contains a local point. Both go through the tile set's layout, and
`localToCell` works for negative points:

```ts
import { cellToLocal, localToCell } from '@forge-game-engine/forge/tilemaps';

const center = cellToLocal(groundLayer, 3, -2);
const { column, row } = localToCell(groundLayer, { x: -5, y: 40 });
```

### Converting between cells and world space

[`cellToWorld`](/Forge/docs/api/functions/cellToWorld) and
[`worldToCell`](/Forge/docs/api/functions/worldToCell) do the same in world
space, through the layer entity's world position, rotation and scale (see
[Converting points between local and world space](../common/transforms.md#converting-points-between-local-and-world-space)).
They take the layer's entity.

To pick the cell under the mouse, convert the pointer to world space with a
[`CameraView`](../rendering/world-units-and-cameras.md#what-a-camera-sees),
then to a cell:

```ts
import { getCameraView } from '@forge-game-engine/forge/rendering';
import { worldToCell } from '@forge-game-engine/forge/tilemaps';

const view = getCameraView(world, camera, renderContext);
const worldPoint = view.viewportToWorld(mouse.position);
const { column, row } = worldToCell(world, ground, worldPoint);
```

## Reacting to changes

A system that builds something from a layer, such as the tilemap render
system, the tilemap collider system or a navigation grid, finds what
changed with the layer's `version` and each chunk's `changedAt`. `version`
goes up by one on every cell function call that changes a cell, and the
call sets `changedAt` on every chunk it changed to the new `version`.
`setTileSet` does the same for every chunk. A call that changes nothing
leaves both alone.

The system keeps, in its own component on the layer entity, the layer
component it built from, the `version` it last processed and what it built
per chunk. On each update:

1. If the entity's `TilemapLayerEcsComponent` isn't the one it recorded, it
   removes everything it built, records the new one and sets its last
   version to `-1`.
2. If `version` equals its last version, nothing changed.
3. Otherwise it rebuilds every chunk whose `changedAt` is greater than its
   last version, removes what it built for chunks that are no longer in
   `chunks`, and records `version`.

The tilemap render system follows these steps with its
`TilemapRenderStateEcsComponent`. Nothing on the layer is cleared, so any
number of systems track the same layer without hiding changes from each
other.

:::caution
Adding a `TilemapLayerEcsComponent` to an entity that has one replaces the
layer, and the new layer's `version` starts again at `0`. Comparing
versions alone misses the replacement, which is why step 1 compares the
component itself.
:::

A system that writes tiles runs before the systems that read them.

## Removing a layer

Removing a layer's entity with `world.removeEntity` removes the layer, its
tiles and its child entities.
[Removing a drawn layer](./rendering.md#removing-a-drawn-layer) says what
happens to the meshes the tilemap render system built for it.
