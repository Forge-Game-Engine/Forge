# Tilemaps

A tilemap is a grid of tiles stored as data, not as entities. Each layer of
a map is one entity holding a packed tile per cell, and systems draw the
layer as meshes and give it a collider that outlines its solid tiles.

## The parts of a tilemap

- A [tile set](./tile-sets.md) holds a [grid layout](../math/grid-layouts.md),
  orthogonal or isometric, that places every cell, and one or more texture
  atlases whose regions are the tiles. It gives each tile its data: custom
  properties, where its image sits in its cell, a collision shape and an
  animation.
- A [layer](./layers.md) is an entity with a
  [`TilemapLayerEcsComponent`](/Forge/docs/api/interfaces/TilemapLayerEcsComponent):
  a tile set and a packed tile per cell, which names a tile of the tile set
  and how its image is turned or mirrored. The cell functions write and
  read its cells and convert between cells, the layer's local space and
  world space. A map is a root entity with one child entity per layer.
- The [tilemap render system](./rendering.md) builds meshes from each
  layer's cells and keeps them up to date as cells change, and the render
  system draws them with the game's sprites. A layer draws by chunks, or,
  y-sorted, row by row among the game's characters.
- [Animated tiles](./animated-tiles.md) show the frames their tile set
  gives them. The tilemap render system chooses the frame from the game's
  time.
- The [tilemap collider system](./collision.md) builds a
  [`ChainCollider`](../physics/chain-colliders.md) outlining a layer's solid
  tiles from their collision shapes, and rebuilds it when the layer's
  cells change. The physics systems collide bodies with it.
- The [Tiled loader](./loading-tiled-maps.md) reads a map made in the Tiled
  editor into a tile set, layers of tiles and objects, and creates an
  entity for each of its tile and group layers, with a collider on the
  layers whose tiles have collision shapes.

[Isometric maps](./isometric-maps.md) covers what a map with an isometric
layout adds: tall tiles, y-sorting them with characters, colliding with
their bases and picking cells with the mouse.

## Building a tilemap

A game builds a tilemap in this order:

1. Create a tile set from a layout and texture atlases, and give the tiles
   that need it their data (see [Tile sets](./tile-sets.md)).
2. Create a layer entity for each layer, under a root entity for the map
   (see [Layers and maps](./layers.md#layers-and-maps)).
3. Write the layers' tiles with the cell functions (see
   [Editing a layer](./layers.md#editing-a-layer)).
4. Give the solid layers a collider (see
   [Giving a layer a collider](./collision.md#giving-a-layer-a-collider)).
5. Register the tilemap systems (see
   [Registering the tilemap systems](#registering-the-tilemap-systems)).

A map made in Tiled does steps 1 to 4 when it's loaded and spawned (see
[Loading Tiled maps](./loading-tiled-maps.md)).

## Registering the tilemap systems

The tilemap collider system and the tilemap render system read the cells
that the game's systems write, and write the colliders and meshes that the
physics systems and the render system read. A game that edits its tiles,
collides with them and draws them registers them in this order:

```ts
import {
  createTransformEcsSystem,
  createTransformInterpolationEcsSystem,
  registerFixedUpdate,
} from '@forge-game-engine/forge/common';
import {
  createBroadPhase,
  createBroadPhaseEcsSystem,
  createCollisionResolutionEcsSystem,
  createEulerIntegrationEcsSystem,
  createGravityEcsSystem,
  createNarrowPhaseEcsSystem,
  createSleepEcsSystem,
} from '@forge-game-engine/forge/physics';
import { createRenderEcsSystem } from '@forge-game-engine/forge/rendering';
import {
  createTilemapColliderEcsSystem,
  createTilemapRenderEcsSystem,
} from '@forge-game-engine/forge/tilemaps';

createBroadPhase(world);

const physics = { group: registerFixedUpdate(world, time) };

// Once per fixed step.
world.addSystem(createTransformEcsSystem(time), physics);
world.addSystem(createBroadPhaseEcsSystem(collisionPairs), physics);
world.addSystem(
  createNarrowPhaseEcsSystem(collisionPairs, collisionManifolds),
  physics,
);
world.addSystem(createSleepEcsSystem(collisionManifolds, time), physics);
world.addSystem(createGravityEcsSystem(time), physics);
world.addSystem(
  createCollisionResolutionEcsSystem(
    collisionManifolds,
    contactConstraints,
    time,
  ),
  physics,
);
world.addSystem(createEulerIntegrationEcsSystem(time), physics);
world.addSystem(createTransformInterpolationEcsSystem(), physics);

// Once per frame.
world.addSystem(tileEditingSystem);
world.addSystem(createTilemapColliderEcsSystem());
world.addSystem(createTilemapRenderEcsSystem(renderContext, time));
world.addSystem(createTransformEcsSystem(time));
world.addSystem(createRenderEcsSystem(renderContext));
```

1. The physics systems run once per fixed step, in the order
   [Registering the physics systems](../physics/index.md#registering-the-physics-systems)
   gives, before the default group.
2. The game's systems that set and clear tiles run first in the default
   group, so an edit draws on the frame it's made.
3. The tilemap collider system rebuilds the collider of each layer whose
   cells changed. The broad phase reads it in the next fixed step, so an
   edit collides from the next step.
4. The tilemap render system rebuilds the meshes of each changed chunk,
   and creates the entities of new chunks, before the transform system
   gives them their world transform.
5. The render system draws the tiles with everything else.

A game that doesn't collide with its tiles leaves out the tilemap collider
system and the physics systems.
