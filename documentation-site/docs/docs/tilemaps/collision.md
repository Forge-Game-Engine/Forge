---
sidebar_position: 5
---

# Tile collision

A [tile set](./tile-sets.md) says which tiles are solid and what shape they
are. A layer with a tilemap collider gets one static
[`ChainCollider`](../physics/chain-colliders.md) outlining all of its
solid tiles, rebuilt on every tick its tiles change, which the physics
systems collide bodies with like any other collider.

## Collision shapes

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
polygon with fewer than 3 points, a point that isn't finite or a point
outside the footprint, or one that isn't strictly convex or crosses itself
once its points are snapped to `1/65,536` of a cell. Repeated points and
points along a straight edge are dropped first. It stores the polygon with
positive signed area (clockwise on screen), in either order it was given.

## Turned and mirrored shapes

A cell's transform bits move its tile's collision shape inside the cell
footprint's bounds: transpose, then flip X, then flip Y, in the bounds'
normalized coordinates. That's the map they apply to the image inside its
rectangle (see [Turning and mirroring tiles](./tile-sets.md#turning-and-mirroring-tiles)),
so in both layouts a turned or mirrored square tile collides where it
draws. A `'cell'` shape is the same under every transform.

:::note
The shape always stays inside its own cell. For a tile whose image is
larger than its cell, the bits turn the shape about the center of the
cell's footprint, not the image's. A transposed tile that isn't square
turns its image out of the footprint's bounds (see
[Tile image placement](./tile-sets.md#tile-image-placement)), but its shape
stays in them.
:::

## Giving a layer a collider

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

An [animated tile](./animated-tiles.md) collides with the shape of the tile
placed in the cell, whatever frame shows, and a frame change doesn't
rebuild the collider. To change a cell's collision over time, set a
different tile in it with `setTile`.

The system is the only writer of the `collider` field: anything else
written there is replaced on its next tick. Register it in the default
group, after every system that edits tiles. The physics systems run in the
fixed-update group (see
[Registering the physics systems](../physics/index.md#registering-the-physics-systems)),
so a tile set or cleared during a frame collides from the next fixed step.

:::caution
Colliders ignore an entity's scale, so a scaled layer collides at its
unscaled size.
:::

## Collision settings per layer

The system writes only `collider`. `category`, `mask`, `friction`,
`restitution` and `sensor` are the ones given to `addColliderComponent`
(see [Collisions](../physics/collisions.md)), and apply to every tile of the
layer. Tiles that collide differently, such as spikes or water that are
sensors, go on a layer of their own.

## The layer's outline

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

## Finding the tile a body touched

The outline doesn't record which tile an edge came from. To find the tile
at a contact, move a [collision manifold](../physics/collisions.md#reading-collision-manifolds)'s
contact point a short distance into the layer, against the normal, and
convert it to a cell, in a system registered in the fixed-update group
after the narrow phase:

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
