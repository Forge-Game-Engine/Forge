---
sidebar_position: 3
---

# Rendering tilemaps

The tilemap render system draws each [layer](./layers.md) as
[meshes](../rendering/meshes.md): one per chunk of cells and tile set
source, or, for a layer that sorts with characters row by row, one per
sort row (see [Y-sorting tiles with characters](#y-sorting-tiles-with-characters)).
`createRenderEcsSystem` draws those meshes with the game's sprites, text
and other meshes.

## Registering the tilemap render system

[`createTilemapRenderEcsSystem`](/Forge/docs/api/functions/createTilemapRenderEcsSystem)
builds the meshes of every entity that has a `TilemapLayerEcsComponent` and
a `PositionEcsComponent`, and `createRenderEcsSystem` draws them. It takes
the game's `Time`, which chooses the frame of each
[animated tile](./animated-tiles.md). Register it after the systems that
edit tiles, so an edited tile shows on the same frame, and before
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

## Chunk meshes

For a layer that isn't [y-sorted](#y-sorting-tiles-with-characters), the
system builds one mesh for each chunk and each source whose tiles the chunk
holds, two triangles per tile. Each mesh is one draw call, and a mesh whose
tiles are all outside the camera's view isn't drawn. A layer of one source
costs one draw call per chunk on screen.

The system keeps what it built in a
[`TilemapRenderStateEcsComponent`](/Forge/docs/api/interfaces/TilemapRenderStateEcsComponent)
on the layer entity, and on each update rebuilds only the chunks that
changed (see [Reacting to changes](./layers.md#reacting-to-changes)):

- A cell function call that changes a chunk rewrites the vertices of that
  chunk's meshes in place. It creates a mesh, and its GPU buffers, only
  for a source the chunk didn't hold before, and removes the mesh of a
  source the chunk no longer holds.
- The first update after a layer is added builds every chunk at once, so
  the first frame that draws a large map takes longer than the frames
  after it.
- An update where no tile changed, and no
  [animated tile](./animated-tiles.md) changed frame, writes no vertices.
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

## Drawing layers with sprites

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
4. Hierarchy order comes last: a layer whose root entity (the map's root,
   or the layer's own entity if it has no parent) was created before a
   sprite's root draws behind the sprite, and under one root, a layer
   earlier in the tree draws behind.

Hiding the layer entity hides its tiles, and the masks on it and its
ancestors clip them, as for its other children.

### Drawing a character between layers

A character that walks in front of some layers and behind others, such as
a platformer's player behind a foreground of grass, is an entity of its own
created after the map, so it draws after every layer in hierarchy order.
The layers in front of it get a higher draw `layer`:

```ts
import { tilemapLayerId } from '@forge-game-engine/forge/tilemaps';

const foregroundLayer = world.getComponent(foreground, tilemapLayerId);

if (foregroundLayer) {
  foregroundLayer.layer = 1;
}
```

A character with a dynamic or kinematic rigid body has to be a root
entity, since its velocity is in world space, so it can't be placed among
the map's layers by parenting it. A character without one can be a child
of a layer instead, and draws after that layer's tiles and before the
layer's later siblings.

## Drawing order inside a layer

Inside one source's mesh, tiles draw in row-major cell order, and chunk
meshes draw in row-major chunk order, so overlapping tiles draw back to
front: an isometric wall in row `5` covers the tile behind it in row `4`.
A tile outside the placement limits in
[Tile image placement](./tile-sets.md#tile-image-placement) can draw in the
wrong order against its neighbors.

A chunk's meshes draw source by source, so every tile of source `1` in a
chunk draws after every tile of source `0` in the same chunk, whatever their
rows. Two tiles from different sources that overlap, such as walls from two
sheets in an isometric layer, can draw in the wrong order. Keep tiles that
overlap each other in one source, put them in separate layers, or
[y-sort the layer](#y-sorting-tiles-with-characters), which draws them row
by row across sources.

## Y-sorting tiles with characters

A layer that isn't y-sorted sorts as one unit against sprites, so a
character is in front of all of its walls or behind all of them. A y-sorted
layer sorts row by row, so under a camera with `ySort` a character draws in
front of the walls above it on screen and behind the walls below it.

### Making a layer y-sort

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

### Where a tile sorts

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

### Row entities

For a y-sorted layer, the system builds one
[`Geometry`](/Forge/docs/api/classes/Geometry) per source for the whole
layer, with one section per sort row, and draws each row from a child
entity of the layer. A row entity has an identity position, rotation and
scale, a `MeshEcsComponent` that draws its row's section, and a
`DrawOrderEcsComponent` whose `ySortOrigin` is the row's sort Y, so each
row is a sort unit at its own height. The rows are listed in the `rows` of
each source's mesh in the layer's
`TilemapRenderStateEcsComponent.ySortMeshes`. Don't edit, reorder,
reparent or remove them: the system is the only code that writes them.

The system keeps the row entities in ascending sort Y, then source, among
the layer's children, so a camera without `ySort` draws the layer back to
front. A child of the game's on a y-sorted layer, such as a chest, is a sort
unit too, and sorts among the rows by its own Y.

A character standing exactly on a row's sort Y draws in hierarchy order
with it: a character root created after the map draws in front of the
row, and one created before draws behind it.

### Draw calls and culling

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

### Editing a y-sorted layer

An edit rebuilds the whole geometry of each source a changed chunk holds,
or held before the edit, in place, and adds or removes row entities as rows appear or
empty. Rebuilding sorts the source's tiles by sort Y and uploads 128 bytes
per tile, so an edit costs time in proportion to the source's tiles in the
whole layer, not in one chunk. Y-sorting is for wall and prop layers; large
floors, and layers whose tiles change every frame, are layers that aren't
y-sorted.

## Tint, category and draw layer

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

## Texture filtering

Each tile samples only its own region of its source's texture, inset by
half a texel, as sprites do (see
[Filtering at region edges](../rendering/texture-atlases.md#filtering-at-region-edges)).
So no line shows between tiles with `'nearest'` filtering at a fractional
camera position or zoom, or with `'linear'` filtering, and a tileset needs
no extruded or spaced tiles. With `'linear'` filtering, each tile's edge
shows its own edge texels, not a blend with the next cell's tile.

A texture whose `wrap` is `'repeat'` isn't inset, so give tileset textures
the default `'clamp'`.

## Removing a drawn layer

Removing the layer entity removes its chunk or row entities and disposes
their geometries. So does removing its `TilemapLayerEcsComponent` or its
`PositionEcsComponent`, on the system's next update. Adding a new
`TilemapLayerEcsComponent` to the entity replaces the old layer's meshes
with the new layer's on the system's next update.

Removing the tilemap render system, or stopping the world, leaves every
layer's meshes as they were last built: they're still drawn, and edits to
the layer don't change them.
