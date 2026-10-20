# Tilemaps

A tilemap is a grid of tiles stored as data, not as entities. Each layer of
a map is one entity with a
[`TilemapLayerEcsComponent`](/Forge/docs/api/interfaces/TilemapLayerEcsComponent),
which holds a packed tile per cell, and a
[`TileSet`](/Forge/docs/api/interfaces/TileSet), which says what each tile
looks like and how the cells are laid out.

:::note
`createRenderEcsSystem` doesn't draw `TilemapLayerEcsComponent`s.
:::

## Tile sets

A tile set holds a [grid layout](../math/grid-layouts.md) and one or more
sources. [`createTileSet`](/Forge/docs/api/functions/createTileSet) builds
one:

```ts
import { createOrthogonalGridLayout } from '@forge-game-engine/forge/math';
import { createGridTextureAtlas } from '@forge-game-engine/forge/rendering';
import { createTileSet } from '@forge-game-engine/forge/tilemaps';

const tileSet = createTileSet({
  layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
  sources: [
    {
      atlas: createGridTextureAtlas(terrainTexture, {
        cellWidth: 16,
        cellHeight: 16,
      }),
    },
  ],
});
```

A tile set is frozen. Any number of layers use the same one.

### Sources

A source is one [texture atlas](../rendering/texture-atlases.md). Every
region of the atlas is a tile, and a tile's index is its region's index in
`atlas.regions`, which is row-major for a grid atlas. A tile set has up to
`256` sources, so one map can use several textures, such as a terrain sheet
and a prop sheet. A tile names its source by its index in `sources`.

Every tile of a source draws at the source's `tileWidth` by `tileHeight`, in
the layer's local units, whatever its region's size in texels. They default
to the layout's `cellWidth` and `cellHeight`. A source whose tiles are taller
than a cell, such as isometric walls, sets its own:

```ts
const wallSource = {
  atlas: createGridTextureAtlas(wallTexture, { cellWidth: 64, cellHeight: 96 }),
  tileHeight: 96,
};
```

### Tile data

Each tile has a [`TileData`](/Forge/docs/api/interfaces/TileData): custom
`properties`, a `textureOrigin` (see
[Tile image placement](#tile-image-placement)), a `ySortOrigin` and a
`collision` shape (see [Collision](#collision)). A source's `tiles` map
sets them for the tiles that need them, by tile index; every other tile has
no properties, a `(0, 0)` `textureOrigin`, a `0` `ySortOrigin` and no
collision:

```ts
const terrainSource = {
  atlas: terrainAtlas,
  tiles: new Map([
    [4, { properties: { water: true, speed: 0.5 } }],
    [5, { properties: { door: true } }],
  ]),
};
```

Property values are strings, numbers or booleans.

## Layouts

The tile set's layout places every cell, so the same tilemap code works for
an orthogonal map (`createOrthogonalGridLayout`) and an isometric one
(`createIsometricGridLayout`). Columns increase towards `+X` and rows towards
`+Y`, down the screen, and cell `(0, 0)` is placed by the layout at the
layer entity's origin. [Grid Layouts](../math/grid-layouts.md) describes
where each layout puts a cell.

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

`tintColor`, `category` and `layer` mean what they mean on a sprite.

A map with several layers is a root entity with one child entity per
layer. Later siblings draw on top of earlier ones, and
`DrawOrderEcsComponent` sorts a layer between other things, as for any
entity (see [Draw order](../rendering/draw-order.md)):

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

A layer has no size. Cells are stored in chunks of
[`tilemapChunkSize`](/Forge/docs/api/variables/tilemapChunkSize) by
`tilemapChunkSize` cells, created when a tile is written into them and
removed when their last tile is cleared, so any cell from `-2^30` to
`2^30 - 1` on each axis can hold a tile, including negative cells.

## Packed tiles

A cell holds a packed tile: an unsigned 32-bit integer naming a source, a
tile in it and how its image is turned or mirrored.
[`emptyTile`](/Forge/docs/api/variables/emptyTile) (`0`) is an empty cell.
[`packTile`](/Forge/docs/api/functions/packTile) builds one, and
[`unpackTile`](/Forge/docs/api/functions/unpackTile) reads its fields:

```ts
import { packTile, unpackTile } from '@forge-game-engine/forge/tilemaps';

const grass = packTile({ source: 0, tile: 3 });
const { source, tile, flipX } = unpackTile(grass);
```

Two packed tiles are the same tile in the same orientation when they're
equal (`===`).

| Bits  | Field     | Meaning                                                                      |
| ----- | --------- | ---------------------------------------------------------------------------- |
| 31    | flipX     | Mirror the image left to right                                               |
| 30    | flipY     | Mirror the image top to bottom on screen                                     |
| 29    | transpose | Swap the image's X and Y axes (mirror across its top-left/bottom-right line) |
| 28    | present   | Always `1` in a non-empty tile, so no tile packs to `0`                      |
| 20–27 | source    | Source index, `0` to `255`                                                   |
| 0–19  | tile      | Tile index in the source, `0` to `1,048,575`                                 |

The flip bits are in the same place as the flip flags of a Tiled tile and
mean the same thing.

### Turning and mirroring tiles

The three transform bits move the image's content inside its rectangle:
transpose first, then flip X, then flip Y. Together they give all eight
90-degree rotations and mirrors:

| `transpose` | `flipX` | `flipY` | On screen                                      |
| ----------- | ------- | ------- | ---------------------------------------------- |
| `false`     | `false` | `false` | As drawn                                       |
| `false`     | `true`  | `false` | Mirrored left to right                         |
| `false`     | `false` | `true`  | Mirrored top to bottom                         |
| `false`     | `true`  | `true`  | Turned 180 degrees                             |
| `true`      | `true`  | `false` | Turned 90 degrees clockwise                    |
| `true`      | `false` | `true`  | Turned 90 degrees counter-clockwise            |
| `true`      | `false` | `false` | Mirrored across the top-left/bottom-right line |
| `true`      | `true`  | `true`  | Mirrored across the top-right/bottom-left line |

```ts
const turnedClockwise = packTile({
  source: 0,
  tile: 3,
  transpose: true,
  flipX: true,
});
```

In normalized image coordinates (`(0, 0)` top-left, `(1, 1)` bottom-right),
transpose moves content at `(u, v)` to `(v, u)`, flip X to `(1 - u, v)` and
flip Y to `(u, 1 - v)`. Code that draws a tile by choosing texture
coordinates uses the inverse: the point `p` of the drawn rectangle shows the
image at the flips undone, then the transpose undone. The two 90-degree turns
are the only combinations that differ from their inverse.

A transposed tile that isn't square is stretched to its rectangle.

## Tile image placement

[`getTileImageRect`](/Forge/docs/api/functions/getTileImageRect) returns
where a tile's image is when it's in a cell, in the layer's local space:

```ts
import { getTileImageRect } from '@forge-game-engine/forge/tilemaps';

const imageRect = getTileImageRect(tileSet, column, row, tile);
```

The image is its source's `tileWidth` by `tileHeight`. Its bottom-left
corner is on the bottom-left corner of the cell footprint's bounds, then it
moves by the tile's `textureOrigin`, Y-down: a positive `y` moves it down.
An image taller than its cell reaches up from the cell's footprint. The
transform bits don't change the rectangle.

:::caution
Cells draw back to front when each tile's image is at most `cellWidth`
wide, has a `textureOrigin.x` of `0` and a `textureOrigin.y` of `0` or
less (see [Drawing cells back to front](../math/grid-layouts.md#drawing-cells-back-to-front)).
A tile outside those limits, such as a prop that overhangs its cell, can
draw in the wrong order against its neighbors.
:::

## Editing a layer

The cell functions are the only code that writes a layer's cells. Every
function that takes a tile throws, without changing the layer, for a tile
whose source or tile index the layer's tile set doesn't have.

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

## Collision

A tile set says which tiles are solid and what shape they are. A layer
with a tilemap collider gets one static
[`ChainCollider`](../physics/chain-colliders.md) outlining all of its
solid tiles, rebuilt on every tick its tiles change.

### Collision shapes

A tile's `collision` is one of:

- `'cell'`: the cell's whole footprint, a rectangle in an orthogonal layout
  and a diamond in an isometric one;
- a convex polygon of at least 3 points, such as a slope, a half tile or
  the base of a wall;
- `null`, the default: the tile doesn't collide.

```ts
const terrainSource = {
  atlas: terrainAtlas,
  tiles: new Map([
    [0, { collision: 'cell' }],
    [
      1,
      {
        collision: [
          { x: -8, y: 8 },
          { x: 8, y: -8 },
          { x: 8, y: 8 },
        ],
      },
    ],
  ]),
};
```

A polygon's points are in tile-local space: the origin is the center of the
cell's footprint, in the layer's local units, Y-down. In a 16 by 16
orthogonal layout the footprint runs from `(-8, -8)` to `(8, 8)`, so the
polygon above is a slope solid in the cell's bottom-right half. In a 64 by
32 isometric layout the footprint is the diamond with corners `(0, -16)`,
`(32, 0)`, `(0, 16)` and `(-32, 0)`. Tile-local space doesn't depend on the
tile's image, so a tall isometric wall tile's shape is its base on the
floor.

[`createTileSet`](/Forge/docs/api/functions/createTileSet) throws for a
polygon with a point outside the footprint, or that isn't strictly convex
or crosses itself once its points are snapped to `1/65,536` of a cell. It
stores the polygon with positive signed area (clockwise on screen), in
either order it was given.

### Turned and mirrored shapes

A cell's transform bits move its tile's collision shape inside the
footprint's bounds the way they move its image (see
[Turning and mirroring tiles](#turning-and-mirroring-tiles)), in both
layouts, so a turned or mirrored tile collides where it draws. A `'cell'`
shape is the same under every transform.

:::note
For a tile whose image is larger than its cell, the bits turn the shape
about the center of the cell's footprint, not the image's, so the shape
stays inside its cell.
:::

### Giving a layer a collider

Add a `ColliderEcsComponent` holding an empty `ChainCollider` and a
[`TilemapColliderEcsComponent`](/Forge/docs/api/interfaces/TilemapColliderEcsComponent)
to the layer's entity, and register
[`createTilemapColliderEcsSystem`](/Forge/docs/api/functions/createTilemapColliderEcsSystem):

```ts
import {
  addColliderComponent,
  ChainCollider,
} from '@forge-game-engine/forge/physics';
import {
  addTilemapColliderComponent,
  createTilemapColliderEcsSystem,
} from '@forge-game-engine/forge/tilemaps';

addColliderComponent(world, ground, {
  collider: new ChainCollider([]),
  friction: 0.4,
});
addTilemapColliderComponent(world, ground);

world.addSystem(createTilemapColliderEcsSystem());
```

On a tick when the layer's `version` changed, its
`TilemapLayerEcsComponent` was replaced, or its collider isn't the one the
system last wrote, the system sets the `ColliderEcsComponent`'s `collider`
to a new `ChainCollider` built from the layer's solid tiles. On other
ticks it does nothing, and several edits in one tick rebuild the collider
once. A layer with no solid tiles has a `ChainCollider` with no loops,
which collides with nothing.

The system is the only writer of the `collider` field: anything else
written there is replaced on its next tick. Register it after every system
that edits tiles and before `createBroadPhaseEcsSystem`, so a tile set or
cleared during a tick collides on that tick.

:::caution
Colliders ignore an entity's scale, so a scaled layer collides at its
unscaled size.
:::

### Collision settings per layer

The system writes only `collider`. `category`, `mask`, `friction`,
`restitution` and `sensor` are the ones given to `addColliderComponent`
(see [Collisions](../physics/collisions.md)), and apply to every tile of the
layer. Tiles that collide differently, such as spikes that are sensors, go
on a layer of their own.

### The layer's outline

[`buildTilemapCollisionLoops`](/Forge/docs/api/functions/buildTilemapCollisionLoops)
returns the loops the system builds, in the layer's local space:

```ts
import { buildTilemapCollisionLoops } from '@forge-game-engine/forge/tilemaps';

const loops = buildTilemapCollisionLoops(groundLayer);
```

The outline is the union of the solid tiles' shapes. Edges two solid tiles
share are removed, so a body sliding along the outline doesn't catch where
tiles meet, and a straight run of edges is one edge: a floor of 20 tiles
is one edge. Loops around solid have positive signed area and loops around
holes negative. Two tiles that meet only at a corner give two loops that
share that point. The same tiles give the same loops in the same order,
whatever order they were set in.

`buildTilemapCollisionLoops` reads every stored cell of the layer.

### Finding the tile a body touched

The outline doesn't record which tile an edge came from. To find the tile
at a contact, move a [collision manifold](../physics/collisions.md#reading-collision-manifolds)'s
contact point a short distance into the layer, against the normal, and
convert it to a cell:

```ts
import { getTile, worldToCell } from '@forge-game-engine/forge/tilemaps';

// The normal points from entityA towards entityB. 0.1 is a distance in
// world units, well under a cell's size.
const intoLayer = manifold.entityA === ground ? -1 : 1;
const [contactPoint] = manifold.contactPoints;
const { column, row } = worldToCell(world, ground, {
  x: contactPoint.x + manifold.normal.x * intoLayer * 0.1,
  y: contactPoint.y + manifold.normal.y * intoLayer * 0.1,
});
const touchedTile = getTile(groundLayer, column, row);
```

## Reacting to changes

A system that builds something from a layer, such as colliders or a
navigation grid, finds what changed with the layer's `version` and each
chunk's `changedAt`. `version` goes up by one on every cell function call
that changes a cell, and the call sets `changedAt` on every chunk it
changed to the new `version`. A call that changes nothing leaves both
alone.

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

Nothing on the layer is cleared, so any number of systems track the same
layer without hiding changes from each other.

:::caution
Adding a `TilemapLayerEcsComponent` to an entity that has one replaces the
layer, and the new layer's `version` starts again at `0`. Comparing
versions alone misses the replacement, which is why step 1 compares the
component itself.
:::

A system that writes tiles runs before the systems that read them.
