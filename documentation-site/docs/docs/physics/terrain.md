---
sidebar_position: 6
---

# Terrain

A [`TerrainCollider`](/Forge/docs/api/classes/TerrainCollider) is a
collision shape for static ground that isn't convex, such as hills or a
canyon. It is a heightmap: a chain of surface points ordered from left to
right, closed into a solid slab by a flat bottom edge below them. The
rendering module draws terrain as a textured mesh built from the same
points.

## Creating a terrain collider

Pass the surface points and the slab's `depth` to the `TerrainCollider`
constructor, and add it to an entity with a `PositionEcsComponent`:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import {
  addColliderComponent,
  TerrainCollider,
} from '@forge-game-engine/forge/physics';

const ground = world.createEntity();

addPositionComponent(world, ground);
addColliderComponent(world, ground, {
  collider: new TerrainCollider(
    [
      { x: -400, y: 40 },
      { x: -200, y: -20 },
      { x: 0, y: 0 },
      { x: 200, y: -60 },
      { x: 400, y: 20 },
    ],
    200,
  ),
});
```

The points are in the entity's local space. With the entity at the origin
and unrotated, they are world positions, and the ground is below them. The
constructor throws for fewer than 2 points, points not ordered by strictly
increasing `x`, or a `depth` that isn't positive. `depth` is the distance
from the lowest point to the slab's bottom edge.

A terrain is static: its entity has no `RigidBodyEcsComponent` (see
[Body types](./rigid-bodies.md#body-types)).

## Colliding with terrain

Bodies collide only with the terrain's surface, the chain of edges between
consecutive points, and never with the slab's sides or bottom. A body
touching several edges gets a separate collision manifold for each edge,
with that edge's normal. Each contact's normal comes from the surface the
body touches, so a body resting where two edges meet isn't pushed sideways.

Each edge a body touches adds a contact that collision resolution solves
every tick, so closely spaced points give a wide body more contacts. Space
points only as closely as the ground's shape needs.

:::caution
A terrain is one-sided. A body that gets below the surface is pushed back
up through it, and a body below the slab's bottom edge doesn't collide with
it. Use a `PolygonCollider` for a ceiling or for a platform that bodies hit
from below. A ray can still hit the terrain from any side (see
[Raycasting](./raycasting.md)).
:::

:::caution
Two `TerrainCollider`s whose bounds overlap throw an error in
`createNarrowPhaseEcsSystem`, which has no test between two terrains. Give
terrains that touch or overlap a `category` and `mask` that exclude each
other (see
[Filtering which colliders collide](./collisions.md#filtering-which-colliders-collide)).
:::

A fast circle can sink into or pass through the surface within one tick;
[Continuous Collision Detection](./continuous-collision-detection.md) stops
it at the surface.

## Drawing terrain

The rendering module draws terrain in three steps: build a smooth curve
from a few control points, build a textured mesh from the curve, and draw
the mesh with its own system.

### Building a curve

[`buildTerrainCurve`](/Forge/docs/api/functions/buildTerrainCurve) builds a
smooth curve through a list of control points, ordered by strictly
increasing `x`, and returns it as a list of closely spaced
[`TerrainCurvePoint`](/Forge/docs/api/interfaces/TerrainCurvePoint)s. The
second argument is the number of points sampled between each pair of
control points.

```ts
import { TerrainCollider } from '@forge-game-engine/forge/physics';
import { buildTerrainCurve } from '@forge-game-engine/forge/rendering';

const curvePoints = buildTerrainCurve(
  [
    { x: -400, y: 40 },
    { x: -200, y: -20 },
    { x: 0, y: 0 },
    { x: 200, y: -60 },
    { x: 400, y: 20 },
  ],
  20,
);

const terrainCollider = new TerrainCollider(
  curvePoints.map((curvePoint) => curvePoint.position),
  200,
);
```

Build the `TerrainCollider` from the curve's positions, so that the drawn
surface and the collision surface are the same.
[`heightAtLocalX`](/Forge/docs/api/functions/heightAtLocalX) returns the
curve's height at a local `x`, for example to place an entity on the
surface.

### Building the mesh

[`createTerrainMesh`](/Forge/docs/api/functions/createTerrainMesh) builds a
mesh from the curve points, textured with two layers: a `border` texture
from the surface down to `borderWidth`, blending into a `fill` texture
below it.

```ts
import { Vec2 } from '@forge-game-engine/forge/math';
import {
  Color,
  createTerrainMesh,
  createTexture,
} from '@forge-game-engine/forge/rendering';

const borderImage = await renderContext.imageCache.getOrLoad('border.png');
const fillImage = await renderContext.imageCache.getOrLoad('fill.png');

const borderTexture = createTexture(renderContext, borderImage, {
  wrap: 'repeat',
});
const fillTexture = createTexture(renderContext, fillImage, { wrap: 'repeat' });

const mesh = createTerrainMesh(renderContext, {
  curvePoints,
  depth: 200,
  position: Vec2.zero,
  angle: 0,
  border: {
    texture: borderTexture,
    tileSize: { x: 160, y: 70 },
    tint: Color.white,
  },
  fill: {
    texture: fillTexture,
    tileSize: { x: 90, y: 90 },
    tint: Color.white,
  },
  borderWidth: 40,
});
```

`depth` is the `TerrainCollider`'s depth, and `position` and `angle` are
the terrain entity's world position and rotation. The mesh's vertices are
in world space, so the mesh doesn't move when the entity does.

`createTerrainMesh` tiles both textures across the terrain, and throws for
a texture without `wrap: 'repeat'` (see
[Textures](../rendering/textures.md)). The mesh doesn't own the textures:
dispose of them when no mesh uses them.

### Drawing the mesh

Add a [`TerrainMeshEcsComponent`](/Forge/docs/api/interfaces/TerrainMeshEcsComponent)
with [`addTerrainMeshComponent`](/Forge/docs/api/functions/addTerrainMeshComponent),
and register
[`createTerrainRenderEcsSystem`](/Forge/docs/api/functions/createTerrainRenderEcsSystem)
before `createRenderEcsSystem`, so sprites are drawn over the terrain:

```ts
import {
  addTerrainMeshComponent,
  createRenderEcsSystem,
  createTerrainRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';

addTerrainMeshComponent(world, ground, { mesh });

world.addSystem(createTerrainRenderEcsSystem(renderContext));
world.addSystem(createRenderEcsSystem(renderContext));
```

The system draws every entity with a `TerrainMeshEcsComponent` for each
camera whose `cullingMask` matches the component's `category`, as for a
sprite (see [Sprites](../rendering/sprites.md)). While at least one
`TerrainMeshEcsComponent` exists, the system clears each camera's
destination itself and sets `renderContext.clearStrategy` to
`CLEAR_STRATEGY.none`, so `createRenderEcsSystem` doesn't clear the
terrain it drew.
