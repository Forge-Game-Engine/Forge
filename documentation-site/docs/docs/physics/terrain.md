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
      { x: -400, y: -40 },
      { x: -200, y: 20 },
      { x: 0, y: 0 },
      { x: 200, y: 60 },
      { x: 400, y: -20 },
    ],
    200,
  ),
});
```

The points are in the entity's local space. With the entity at the origin
and unrotated, they are world positions, and the ground is below them, toward
`+Y`. The
constructor throws for fewer than 2 points, points not ordered by strictly
increasing `x`, or a `depth` that isn't positive. `depth` is the distance
from the lowest point (the one with the greatest `y`) to the slab's bottom
edge.

A terrain is for static and kinematic bodies: give its entity no
`RigidBodyEcsComponent`, or a `'static'` or `'kinematic'` one (see
[Body types](./rigid-bodies.md#body-types)). A terrain has no mass, and a
`'dynamic'` body with a `TerrainCollider` throws when it is simulated.

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
it. Use a [`ChainCollider`](./chain-colliders.md) for walls, ceilings,
overhangs or platforms that bodies hit from below. A ray can still hit the
terrain from any side (see [Raycasting](./raycasting.md)).
:::

Two `TerrainCollider`s, or a `TerrainCollider` and a `ChainCollider`, never
collide with each other.

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
    { x: -400, y: -40 },
    { x: -200, y: 20 },
    { x: 0, y: 0 },
    { x: 200, y: 60 },
    { x: 400, y: -20 },
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
import { Color, createTerrainMesh } from '@forge-game-engine/forge/rendering';

const [borderTexture, fillTexture] = await Promise.all([
  renderContext.textureCache.getOrLoad('border.png', { wrap: 'repeat' }),
  renderContext.textureCache.getOrLoad('fill.png', { wrap: 'repeat' }),
]);

const mesh = createTerrainMesh(renderContext, {
  curvePoints,
  depth: 200,
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

`depth` is the `TerrainCollider`'s depth. The mesh's vertices are the curve
points in the terrain entity's local space, the same space as the
collider's points.

`createTerrainMesh` tiles both textures across the terrain, and throws for
a texture without `wrap: 'repeat'` (see
[Textures](../rendering/textures.md)). The mesh doesn't own the textures:
dispose of them when no mesh uses them.

### Drawing the mesh

`createTerrainMesh` returns a geometry and a mesh material. Add them to the
terrain entity with
[`addMeshComponent`](/Forge/docs/api/functions/addMeshComponent):

```ts
import { addMeshComponent } from '@forge-game-engine/forge/rendering';

addMeshComponent(world, ground, mesh);
```

`createRenderEcsSystem` draws the terrain as a [mesh](../rendering/meshes.md):
through the entity's world position, rotation and scale, so it follows the
entity and its collider, and in the same
[draw order](../rendering/draw-order.md) as sprites. Create the terrain
entity before the sprites that go in front of it, or give the mesh a lower
`layer`:

```ts
addMeshComponent(world, ground, { ...mesh, layer: -1 });
```
