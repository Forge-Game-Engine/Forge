# Tilemaps

A tilemap is a grid of tiles stored as data, not as entities. Each layer of
a map is one entity with a
[`TilemapLayerEcsComponent`](/Forge/docs/api/interfaces/TilemapLayerEcsComponent),
which holds a packed tile per cell, and a
[`TileSet`](/Forge/docs/api/interfaces/TileSet), which says what each tile
looks like and how the cells are laid out. The tilemap render system draws
each layer as [meshes](../rendering/meshes.md), one per chunk of cells and
tile set source, or, for a layer that sorts with characters row by row, one
per source (see [Rendering](#rendering)).

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
[Tile image placement](#tile-image-placement)), a `ySortOrigin` (see
[Where a tile sorts](#where-a-tile-sorts)), a
`collision` shape (see [Collision](#collision)) and an `animation` (see
[Animated tiles](#animated-tiles)). A source's `tiles` map sets them for
the tiles that need them, by tile index; every other tile has no
properties, a `(0, 0)` `textureOrigin`, a `0` `ySortOrigin`, no collision
and no animation:

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

`tintColor`, `category` and `layer` mean what they mean on a sprite (see
[Tint, category and draw layer](#tint-category-and-draw-layer)).

A map with several layers is a root entity with one child entity per
layer. Later siblings draw on top of earlier ones, and
`DrawOrderEcsComponent` sorts a layer between other things, as for any
entity (see [Drawing layers with sprites](#drawing-layers-with-sprites)):

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

A transposed tile that isn't square is turned, not stretched: its rectangle
swaps its width and height (see [Tile image placement](#tile-image-placement)).

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
An image taller than its cell reaches up from the cell's footprint. This
is the rule Tiled uses, so a tile from a Tiled tileset is placed where Tiled
draws it.

A tile with its transpose bit set is `tileHeight` wide and `tileWidth`
tall, with the same bottom-left corner: a 16 by 32 tile turned on its side
covers 32 by 16. The flip bits don't change the rectangle.

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

## Rendering

### Registering the tilemap render system

[`createTilemapRenderEcsSystem`](/Forge/docs/api/functions/createTilemapRenderEcsSystem)
builds the meshes of every entity that has a `TilemapLayerEcsComponent` and
a `PositionEcsComponent`, and `createRenderEcsSystem` draws them. It takes
the game's `Time`, which chooses the frame of each
[animated tile](#animated-tiles). Register it after the systems that edit
tiles, so an edited tile shows on the same frame, and before
`createTransformEcsSystem`, so a new chunk mesh gets its world transform on
the frame it's created:

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import { createRenderEcsSystem } from '@forge-game-engine/forge/rendering';
import { createTilemapRenderEcsSystem } from '@forge-game-engine/forge/tilemaps';

world.addSystem(tileEditingSystem);
world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
```

### Chunk meshes

For a layer that isn't [y-sorted](#y-sorting-tiles-with-characters), the
system builds one mesh for each chunk and each source whose tiles the chunk
holds, two triangles per tile. Each mesh is one draw call, and a mesh whose
tiles are all outside the camera's view isn't drawn. A layer of one source
costs one draw call per chunk on screen.

The system keeps what it built in a
[`TilemapRenderStateEcsComponent`](/Forge/docs/api/interfaces/TilemapRenderStateEcsComponent)
on the layer entity, and on each update rebuilds only the chunks that
changed:

- A cell function call that changes a chunk rewrites the vertices of that
  chunk's meshes in place. It creates a mesh, and its GPU buffers, only
  for a source the chunk didn't hold before, and removes the mesh of a
  source the chunk no longer holds.
- The first update after a layer is added builds every chunk at once, so
  the first frame that draws a large map takes longer than the frames
  after it.
- An update where no tile changed, and no
  [animated tile](#animated-tiles) changed frame, writes no vertices.
- Vertex data takes at least 128 bytes per tile in memory, and as much
  again on the GPU.

### Chunk entities

Each mesh is on its own entity, a
[`MeshEcsComponent`](/Forge/docs/api/interfaces/MeshEcsComponent) on a
child of the layer entity with an identity position, rotation and scale, so
the layer's transform places the tiles. The system keeps these children in
row-major chunk order among themselves, and a chunk's meshes in source
order. Don't edit, reorder, reparent or remove them: the system is the only
code that writes them.

A layer entity can have children of its own, such as props. A child added
to the layer comes after the chunk entities in sibling order, so it draws
on top of the tiles. The system places a new chunk entity next to the
other chunk entities, so a child of the game's keeps its place before or
after them. To draw a child under the tiles, move it before them with
`world.setSiblingIndex(child, 0)` or give it a lower
`DrawOrderEcsComponent` order.

### Drawing layers with sprites

Chunk meshes sort with sprites, text and other meshes by the same keys as
any child of the layer entity (see [Draw order](../rendering/draw-order.md)):

1. The layer's draw `layer` comes first, as for a sprite.
2. The layer entity's world order comes next, so a layer with a lower
   `DrawOrderEcsComponent` order than a sprite draws behind it.
3. Under a camera with `ySort`, Y comes next. Every chunk entity is at the
   layer entity's position, so a layer sorts as a whole by its sort unit's
   Y, not tile by tile (see
   [Sorting by height on screen](../rendering/draw-order.md#sorting-by-height-on-screen)).
   A [y-sorted layer](#y-sorting-tiles-with-characters) sorts row by row
   instead.
4. Hierarchy order comes last: a layer entity created, or placed among its
   siblings, before a sprite's entity draws behind it.

Hiding the layer entity hides its tiles, and the masks on it and its
ancestors clip them, as for its other children.

### Drawing order inside a layer

Inside one source's mesh, tiles draw in row-major cell order, and chunk
meshes draw in row-major chunk order, so overlapping tiles draw back to
front: an isometric wall in row `5` covers the tile behind it in row `4`.
A tile outside the placement limits in
[Tile image placement](#tile-image-placement) can draw in the wrong order
against its neighbors.

A chunk's meshes draw source by source, so every tile of source `1` in a
chunk draws after every tile of source `0` in the same chunk, whatever their
rows. Two tiles from different sources that overlap, such as walls from two
sheets in an isometric layer, can draw in the wrong order. Keep tiles that
overlap each other in one source, put them in separate layers, or
[y-sort the layer](#y-sorting-tiles-with-characters), which draws them row
by row across sources.

### Y-sorting tiles with characters

A layer that isn't y-sorted sorts as one unit against sprites, so a
character is in front of all of its walls or behind all of them. A y-sorted
layer sorts row by row, so under a camera with `ySort` a character draws in
front of the walls above it on screen and behind the walls below it.

#### Making a layer y-sort

A layer is y-sorted when its entity's
[`DrawOrderEcsComponent`](/Forge/docs/api/interfaces/DrawOrderEcsComponent)
has `ySortChildren` set to `true`. Every ancestor of the layer entity sets
`ySortChildren` too (see
[Y-sorting an entity's children](../rendering/draw-order.md#y-sorting-an-entitys-children)),
and the camera sets `ySort`. Floors stay layers that aren't y-sorted, with a
lower `order`, so they draw behind everything whatever its Y:

```ts
import {
  addCameraComponent,
  addDrawOrderComponent,
} from '@forge-game-engine/forge/rendering';

addCameraComponent(world, camera, { ySort: true });
addDrawOrderComponent(world, map, { ySortChildren: true });
addDrawOrderComponent(world, floorLayer, { order: -1 });
addDrawOrderComponent(world, wallLayer, { ySortChildren: true });
world.setParent(floorLayer, map);
world.setParent(wallLayer, map);
```

Setting, clearing or removing the flag on a layer entity rebuilds the
layer's meshes as the other kind on the system's next update.

:::note
Y-sorted layers are meant to be unrotated. A row sorts at the world Y of
the point `(0, sortY)` in the layer's local space, so under a rotated layer
the rows don't sort by their tiles' height on screen.
:::

#### Where a tile sorts

A cell's sort Y is the Y of its footprint's center (`layout.getCellCenter`)
plus its placed tile's `ySortOrigin`, in the layer's local units. A tile
whose sort line isn't its cell's center, such as a tree that sorts at its
trunk's base, sets `ySortOrigin`:

```ts
const propSource = {
  atlas: propAtlas,
  tileHeight: 64,
  tiles: new Map([[2, { ySortOrigin: 8 }]]),
};
```

The cells of one source with the same sort Y form a sort row. In an
orthogonal layout a row is a grid row; in an isometric layout it's the
cells with the same `column + row`, a horizontal line on screen. Tiles in
one row draw in row-major cell order, and rows draw in ascending sort Y.
Each different `ySortOrigin` in a grid row makes another row.

#### Row entities

For a y-sorted layer, the system builds one
[`Geometry`](/Forge/docs/api/classes/Geometry) per source for the whole
layer, with one section per sort row, and draws each row from a child
entity of the layer. A row entity has an identity position, rotation and
scale, a `MeshEcsComponent` that draws its row's section, and a
`DrawOrderEcsComponent` whose `ySortOrigin` is the row's sort Y, so each
row is a sort unit at its own height. The rows are listed in the layer's
`TilemapRenderStateEcsComponent.ySortMeshes`. Don't edit, reorder,
reparent or remove them: the system is the only code that writes them.

The system keeps the row entities in ascending sort Y, then source, among
the layer's children, so a camera without `ySort` draws the layer back to
front. A child of the game's on a y-sorted layer, such as a chest, is a sort
unit too, and sorts among the rows by its own Y.

A character standing exactly on a row's sort Y draws in hierarchy order
with it: a character root created after the map draws in front of the
row, and one created before draws behind it.

#### Draw calls and culling

Rows that are neighbors in the draw order and come from one source draw in
one call. A y-sorted layer costs one draw call per visible run of a
source's rows, plus one for each sort unit, such as a character, that sorts
between two of them. A layer entirely in view, with one source and nothing
between its rows, draws in one call.

- Rows of two sources at the same sort Y sort next to each other, so a
  layer whose sources share rows costs a draw call each time the source
  changes along the sort order. Keep a y-sorted layer's tiles in one
  source.
- Each row is culled by the bounds of its own tiles. A row whose tiles are
  all outside the view isn't drawn, and splits the call around it. A row
  with any tile in view draws all of its tiles, including those outside the
  view.

#### Editing a y-sorted layer

An edit rebuilds the whole geometry of each source held by a chunk that
changed, in place, and adds or removes row entities as rows appear or
empty. Rebuilding sorts the source's tiles by sort Y and uploads 128 bytes
per tile, so an edit costs time in proportion to the source's tiles in the
whole layer, not in one chunk. Y-sorting is for wall and prop layers; large
floors, and layers whose tiles change every frame, are layers that aren't
y-sorted.

### Tint, category and draw layer

A layer's `tintColor`, `category` and `layer` are fields of its
`TilemapLayerEcsComponent`, and a change to them shows from the system's
next update:

- `tintColor` multiplies the color of every tile, alpha included.
- `category` is matched against each camera's `cullingMask`, so a camera
  whose mask doesn't include it draws none of the layer's tiles.
- `layer` is the draw layer the layer's tiles sort by.

```ts
import { Color } from '@forge-game-engine/forge/rendering';

groundLayer.tintColor = new Color(1, 1, 1, 0.5);
```

### Texture filtering

Each tile samples only its own region of its source's texture, inset by
half a texel, as sprites do (see
[Filtering at region edges](../rendering/texture-atlases.md#filtering-at-region-edges)).
So no line shows between tiles with `'nearest'` filtering at a fractional
camera position or zoom, or with `'linear'` filtering, and a tileset needs
no extruded or spaced tiles. With `'linear'` filtering, each tile's edge
shows its own edge texels, not a blend with the next cell's tile.

A texture whose `wrap` is `'repeat'` isn't inset, so give tileset textures
the default `'clamp'`.

### Animated tiles

A tile's `animation` is a list of frames. Each frame shows the image of a
tile of the same source for `durationMilliseconds`, and the list repeats:

```ts
const terrainSource = {
  atlas: terrainAtlas,
  tiles: new Map([
    [
      4,
      {
        animation: [
          { tile: 4, durationMilliseconds: 150 },
          { tile: 5, durationMilliseconds: 150 },
          { tile: 6, durationMilliseconds: 200 },
        ],
      },
    ],
  ]),
};
```

The animation belongs to the tile, not to a cell. Every cell that holds the
tile, in every layer, shows the same frame at the same time. The frame is
chosen from `time.timeInMilliseconds`: frame `0` starts at time `0` and at
every multiple of the frames' total duration. A `timeScale` of `0` pauses
every animated tile, and a larger `timeScale` speeds them up.

- A cell's transform bits apply to every frame.
- A frame shows only its tile's image. The cell keeps the placed tile's
  `textureOrigin`, `ySortOrigin`, `collision` and `properties`, and a
  frame's own animation is ignored.
- `createTileSet` throws for an empty `animation`, a frame tile its source
  doesn't have, and a duration that isn't a positive finite number. A tile
  that doesn't animate has `animation: null`.

[`getDisplayedTile`](/Forge/docs/api/functions/getDisplayedTile) returns
the packed tile whose image a cell shows at a time, the placed tile with
its tile index replaced by the current frame's:

```ts
import { getDisplayedTile, getTile } from '@forge-game-engine/forge/tilemaps';

const shown = getDisplayedTile(
  groundLayer.tileSet,
  getTile(groundLayer, column, row),
  time.timeInMilliseconds,
);
```

[`getTileAnimationFrameIndex`](/Forge/docs/api/functions/getTileAnimationFrameIndex)
returns the index of the frame an animation shows at a time.

Each chunk mesh records which of its tiles are animated. On an update where
an animated tile's frame changes, the system rewrites the vertices of only
those tiles, in only the meshes that hold that tile, and uploads them. A
mesh with no animated tiles isn't rewritten, and frame changes never change
the layer's cells or its `version`. A
[y-sorted layer](#y-sorting-tiles-with-characters)'s mesh holds a source's
tiles in the whole layer, so a frame change uploads the texture
coordinates of all of them, 96 bytes per tile: keep animated floors in
layers that aren't y-sorted.

### Removing a drawn layer

Removing the layer entity removes its chunk or row entities and disposes
their geometries. So does removing its `TilemapLayerEcsComponent` or its
`PositionEcsComponent`, on the system's next update. Adding a new
`TilemapLayerEcsComponent` to the entity replaces the old layer's meshes
with the new layer's on the system's next update.

Removing the tilemap render system, or stopping the world, leaves every
layer's meshes as they were last built: they're still drawn, and edits to
the layer don't change them.

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

A cell's transform bits move its tile's collision shape inside the cell
footprint's bounds: transpose, then flip X, then flip Y, in the bounds'
normalized coordinates. That's the map they apply to the image inside its
rectangle (see [Turning and mirroring tiles](#turning-and-mirroring-tiles)),
so in both layouts a turned or mirrored square tile collides where it
draws. A `'cell'` shape is the same under every transform.

:::note
The shape always stays inside its own cell. For a tile whose image is
larger than its cell, the bits turn the shape about the center of the
cell's footprint, not the image's. A transposed tile that isn't square
turns its image out of the footprint's bounds (see
[Tile image placement](#tile-image-placement)), but its shape stays in
them.
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

An [animated tile](#animated-tiles) collides with the shape of the tile
placed in the cell, whatever frame shows, and a frame change doesn't
rebuild the collider. To change a cell's collision over time, set a
different tile in it with `setTile`.

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

A system that builds something from a layer, such as the tilemap render
system, colliders or a navigation grid, finds what changed with the layer's
`version` and each chunk's `changedAt`. `version` goes up by one on every
cell function call
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
