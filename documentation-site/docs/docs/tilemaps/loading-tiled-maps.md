---
sidebar_position: 2
---

# Loading Tiled maps

[`TiledMapCache`](/Forge/docs/api/classes/TiledMapCache) loads maps made in
the [Tiled](https://www.mapeditor.org/) map editor into a
[tile set](./index.md#tile-sets), tile data and object data, and
[`spawnTiledMap`](/Forge/docs/api/functions/spawnTiledMap) creates a
[tilemap layer](./index.md#layers-and-maps) entity for each of the map's
tile layers.

## Saving a map for Forge

The loader reads Tiled's JSON formats: maps (`.tmj`), tilesets (`.tsj`) and
object templates (`.tj`). Save each in JSON in Tiled, or convert XML files
with `tiled --export-map`. A map's tilesets can be embedded in it or saved
as separate files.

Orthogonal and isometric maps load, finite or infinite. Tile layer data can
be CSV or base64, and base64 data can be uncompressed or compressed with
zlib or gzip. Each tileset is one image cut into a grid of tiles.

## Serving a map's files

A map names its tilesets, templates and images by paths relative to
itself, and a tileset names its image relative to the tileset's file. The
loader resolves those paths when it loads the map, so the map and every
file it names must be served as static files, in the same folders as in
your Tiled project. With Vite, put them in the `public` folder:

```
public/
  maps/
    level-1.tmj
  tilesets/
    terrain.tsj
    terrain.png
```

A bundler's renamed copies of the files (such as Vite's `?url` imports)
can't be found from the map.

## Loading a map

Create a `TiledMapCache` with the render context and call
[`getOrLoad`](/Forge/docs/api/classes/TiledMapCache#getorload) with the
map's URL. It returns a promise of a
[`TiledMap`](/Forge/docs/api/interfaces/TiledMap):

```ts
import { TiledMapCache } from '@forge-game-engine/forge/tilemaps';

const tiledMaps = new TiledMapCache(renderContext);
const map = await tiledMaps.getOrLoad('maps/level-1.tmj');
```

The URL is resolved against the page's URL, and the map is cached under the
result: later calls with the same map return the same `TiledMap`, and
[`get`](/Forge/docs/api/classes/TiledMapCache#get) returns it without
waiting. An external tileset or template that several maps use is fetched
once.

Tileset images load through `renderContext.textureCache` with `'nearest'`
filtering, since Tiled tilesets are usually pixel art. Pass a `filter` for
other art:

```ts
const map = await tiledMaps.getOrLoad('maps/painted.tmj', {
  filter: 'linear',
});
```

The promise rejects if a file fails to load, or is invalid or uses a Tiled
feature that isn't supported. The message names the file and the JSON path
of the field, such as `layers[2].chunks[0].width`.

## What a loaded map holds

A `TiledMap` is frozen, and every spawn of it shares it. It holds:

- `tileSet`: one [tile set](./index.md#tile-sets) for the whole map, with
  one source per Tiled tileset, in `firstgid` order. Its layout is an
  orthogonal or isometric [grid layout](../math/grid-layouts.md) with the
  map's tile size as the cell size.
- `tileSets`: each tileset's name, first gid, tile count, `.tsj` URL and
  custom properties, by source index.
- `layers`: the layer tree, in Tiled's order. A tile layer holds its tiles
  as [packed tiles](./index.md#packed-tiles) in the map's tile set, a group
  layer holds its layers, and an object layer holds its objects. A tile
  layer's `blocks` hold their tiles in `Uint32Array`s, which can't be
  frozen: read them, and edit the spawned layers instead, since writing
  into a block changes every later spawn of the map.
- `properties`, `backgroundColor` and `size` (`null` for an infinite map).

Every layer has its `id`, `name`, `path` (its groups' names and its own,
joined with `/`), `offset`, `visible`, `opacity`, `tintColor` and
`properties`.

### Tiles and tile data

Tiled's rows are copied as they are: Tiled and Forge both count rows down
the screen. Tiled's horizontal, vertical and diagonal flip flags become the
packed tile's flip X, flip Y and transpose bits, which mean the same thing.

A tileset's tile size is the size its tiles draw at, and its `tileoffset`
becomes every tile's `textureOrigin`. A tileset whose tile render size is
"Map Grid Size" draws its tiles at the map's tile size. Each tile with data
of its own in Tiled gets it in its
[`TileData`](/Forge/docs/api/interfaces/TileData):

- its custom properties, as `properties`;
- its animation, as `animation`, with Tiled's frame durations in
  milliseconds;
- its collision objects, as `collision`.

A tile's properties of type `color` are stored as `#aarrggbb` strings,
`file` properties as absolute URLs and `object` properties as object ids.

### Tile collision shapes

A tile's collision object becomes its
[collision shape](./index.md#collision-shapes). The loader takes one
rectangle or convex polygon per tile, and throws for a tile with more
objects or another kind of object. A shape that reaches outside the cell's
footprint, such as a rectangle drawn over a tall wall's whole image, is
clipped to the footprint, and a shape that covers the footprint becomes
`'cell'`.

A shape is measured on the tile's image as it draws, so the tileset's
`tileoffset` moves it with the image. For a tileset whose collision
editor grid (Tiled's "Orientation" in the tileset's grid settings) is
isometric, the shape is measured on the isometric cell instead.

## Spawning a map

[`spawnTiledMap`](/Forge/docs/api/functions/spawnTiledMap) creates the
map's entities and returns a
[`SpawnedTiledMap`](/Forge/docs/api/interfaces/SpawnedTiledMap):

```ts
import {
  createTilemapColliderEcsSystem,
  createTilemapRenderEcsSystem,
  spawnTiledMap,
} from '@forge-game-engine/forge/tilemaps';

const spawned = spawnTiledMap(world, map);

world.addSystem(createTilemapColliderEcsSystem());
world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
```

It creates a root entity at the origin with a position, rotation and scale,
and an entity for each tile layer and group layer, parented to its group's
entity or to the root, in Tiled's order. Later layers draw on top of
earlier ones. Object layers create no entity.

- Each layer entity's position is the layer's offset, so a group's offset
  moves every layer in it.
- A tile layer's entity has a `TilemapLayerEcsComponent` over the map's
  tile set, holding its tiles. Its `tintColor` is the layer's tint color
  and opacity, multiplied by those of every group it's in.
- A layer hidden in Tiled gets a `VisibilityEcsComponent` with `visible`
  set to `false`.

A map can be spawned any number of times. Each spawn creates its own
entities and layers, and editing one doesn't change the others or the map.

## Finding a layer's entity

[`findTiledLayer`](/Forge/docs/api/functions/findTiledLayer) finds a
spawned tile or group layer by its Tiled id, its path or its name:

```ts
import { findTiledLayer } from '@forge-game-engine/forge/tilemaps';

const walls = findTiledLayer(spawned, 'Buildings/Walls').entity;
```

A string is matched against paths first, then names. It throws if no layer
matches, or if more than one does, since Tiled doesn't require layer names
to be unique. `spawned.layers` lists every spawned layer and its entity.

## Y-sorting a layer

The root entity and every group entity have a `DrawOrderEcsComponent` with
`ySortChildren` set, so under a camera with `ySort` every layer is a sort
unit (see [Draw order](../rendering/draw-order.md)). To sort a layer's
tiles against the game's sprites, set `ySortChildren` on the layer's
entity too:

```ts
import { addDrawOrderComponent } from '@forge-game-engine/forge/rendering';

addDrawOrderComponent(world, findTiledLayer(spawned, 'Walls').entity, {
  ySortChildren: true,
});
```

Give floor layers a lower `DrawOrderEcsComponent` `order` than the sprites,
so the sprites always draw over them. Cameras without `ySort` draw the
layers in Tiled's order.

## Layer colliders

A tile layer that holds any tile with a collision shape gets a static
`ColliderEcsComponent` and a `TilemapColliderEcsComponent`, so it collides
with its tiles' shapes once `createTilemapColliderEcsSystem` is registered
(see [Giving a layer a collider](./index.md#giving-a-layer-a-collider)).
Set its friction, category and mask on the `ColliderEcsComponent`, found
with `findTiledLayer`.

A layer hidden in Tiled still collides, since `VisibilityEcsComponent`
doesn't affect physics. To turn a layer's collision off, remove both
components from its entity, or set the collider's `mask` to `0`.

## Units and physics

A cell is the map's tile width by tile height in world units: one Tiled
pixel is one world unit. In an orthogonal map, positions in the map are
the positions shown in Tiled. An isometric map's object positions are
projected first (see [Objects in isometric maps](#objects-in-isometric-maps)).

Forge's physics defaults are tuned for world units about a meter across.
A game that collides with a map works in map pixels and scales its
physics by its number of pixels per meter: gravity's `amount`, its speeds
and forces, and the collision resolver's `slop`. For 16 pixel tiles that
stand for a meter:

```ts
import {
  addGravityComponent,
  createCollisionResolutionEcsSystem,
} from '@forge-game-engine/forge/physics';

const pixelsPerMeter = 16;

addGravityComponent(world, player, {
  amount: { x: 0, y: 9.81 * pixelsPerMeter },
});

world.addSystem(
  createCollisionResolutionEcsSystem(manifolds, constraints, time, {
    slop: 0.002 * pixelsPerMeter,
  }),
);
```

Size sprites drawn with the map in pixels too (`pixelsPerUnit: 1`).

Scaling the root entity scales what's drawn, but not the layers'
colliders, which ignore scale. Only scale the root of a map without
colliding layers.

## Reading objects

Object layers are data for the game: each
[`TiledObject`](/Forge/docs/api/interfaces/TiledObject) has an `id`,
`name`, `type` (its class in Tiled), `position`, `rotation`, `visible`,
`properties` and `shape`. The game creates its entities from them:

```ts
for (const layer of map.layers) {
  if (layer.kind !== 'objects') {
    continue;
  }

  for (const object of layer.objects) {
    if (object.type === 'Spawn') {
      createPlayer(world, object.position);
    }
  }
}
```

Positions and sizes are in world units, in map space: the local space of
the spawned root entity, with the offsets of the object's layer and groups
added. The root starts at the origin unrotated and unscaled, so map space
is world space until the game moves it; convert with
[`localToWorldPoint`](/Forge/docs/api/functions/localToWorldPoint) after
that.

`rotation` is in radians, clockwise on screen, about `position`, the way
Tiled turns objects. A point `p` of the shape is at
`position + rotate(p, rotation)`.

The [`shape`](/Forge/docs/api/type-aliases/TiledObjectShape) is one of:

| `kind`      | Holds                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------ |
| `rectangle` | `width` and `height`, from its top-left corner at `position`                               |
| `ellipse`   | `width` and `height` of its bounding box, from `position`                                  |
| `capsule`   | `width` and `height` of its bounding box, from `position`                                  |
| `point`     | Nothing: the object is its `position`                                                      |
| `polygon`   | `points`, relative to `position`                                                           |
| `polyline`  | `points`, relative to `position`                                                           |
| `tile`      | The packed `tile` in the map's tile set with its flip bits, its `width`, `height`, `pivot` |
| `text`      | The `text`, its box's `width` and `height`, and its font, color and alignment              |

A tile object's `pivot` is the point of its image at `position`, as a
normalized pivot with `(0, 1)` at the bottom-left corner, from the tileset's
object alignment.

### Objects in isometric maps

Tiled stores an isometric map's object coordinates in its own projected
pixels. The loader projects every point through the map's layout, so
objects are where Tiled shows them relative to the tiles. Rectangles,
ellipses and capsules become `polygon`s of their projected outline (32
points for an ellipse or capsule). A tile or text object's position is
projected, and its size and pivot are kept, since Tiled draws it facing the
screen.

### Templates

An object made from a template takes every field it doesn't set from the
template's object. Its own properties replace the template's properties
with the same name, and the rest are kept. A tile template's tile is
converted to the map's tile set, through the map's tileset with the same
`.tsj` file.

## Reading custom properties

The map, every layer, every tileset and every object have `properties`,
custom properties by name, with the type they have in Tiled:

```ts
const music = map.properties.music;

if (music?.type === 'file') {
  playMusic(music.value);
}
```

A `color` property's value is a `Color`, or `null` for Tiled's empty
color. A `file` property's value is an absolute URL, resolved against the
file it's written in. An `object` property's value is an object id.
Properties of type `class` are left out.

## Unsupported Tiled features

These throw, naming the file and the field, because the map would draw in
the wrong place or look different:

- staggered, hexagonal and oblique maps;
- image collection tilesets (one image per tile);
- `zstd` compression;
- a tileset's transparent color, or its fill mode "Preserve Aspect Ratio";
- a tileset image whose size differs from what the tileset says.

These are left out, and the rest of the map loads:

- image layers, parallax factors and layer blend modes;
- Wang sets, terrains, allowed tile transformations and tile probability;
- custom properties of type `class`, and tile classes;
- the map's render order: Forge always draws a layer's cells in row-major
  order, which is Tiled's default "Right Down".
