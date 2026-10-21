---
sidebar_position: 6.5
---

# Chain Colliders

A [`ChainCollider`](/Forge/docs/api/classes/ChainCollider) is a collision
shape for static level geometry: closed loops of points, such
as the outline of a level's walls, floors, ceilings and platforms. Bodies
collide with the loops' edges. One `ChainCollider` can hold every loop of
a level, so the whole level is one collider on one entity.

## Loops, solid and holes

A loop is a list of at least 3 points. The last point connects back to the
first, so don't repeat the first point at the end. Each pair of
consecutive points is an edge.

A loop's winding says which side of it is solid:

- A loop whose signed area is positive surrounds solid. Its points turn
  from `+X` towards `+Y`, which is clockwise on screen.
- A loop whose signed area is negative surrounds a hole in solid, such as
  the inside of a room. Its points run counterclockwise on screen. A hole
  loop needs no loop around it: on its own it is a room in solid that has
  no outer edge.

Every edge's outward normal points away from solid, into empty space.
[`calculateSignedArea`](/Forge/docs/api/functions/calculateSignedArea)
returns a loop's signed area, so it shows which kind a loop is:

```ts
import { calculateSignedArea } from '@forge-game-engine/forge/physics';

const isSolid = calculateSignedArea(loop) > 0;
```

## Creating a chain collider

Pass the loops to the `ChainCollider` constructor, and add it to an entity
with a `PositionEcsComponent`:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import {
  addColliderComponent,
  ChainCollider,
} from '@forge-game-engine/forge/physics';

const level = world.createEntity();

addPositionComponent(world, level);
addColliderComponent(world, level, {
  collider: new ChainCollider([
    // The room: a hole, counterclockwise on screen.
    [
      { x: 0, y: 0 },
      { x: 0, y: 360 },
      { x: 640, y: 360 },
      { x: 640, y: 0 },
    ],
    // A platform in the room: solid, clockwise on screen.
    [
      { x: 200, y: 200 },
      { x: 360, y: 200 },
      { x: 360, y: 216 },
      { x: 200, y: 216 },
    ],
  ]),
});
```

The points are in the entity's local space. With the entity at the origin
and unrotated, they are world positions.

A `ChainCollider` with no loops (`new ChainCollider([])`) has no edges and
collides with nothing. A tile layer with no solid tiles has one (see
[Tile collision](../tilemaps/collision.md)).

The constructor throws for:

- a loop with fewer than 3 points;
- two consecutive points that are the same, including a last point that
  repeats the first;
- a loop whose points are all on one line;
- two edges that cross or overlap anywhere except at a point that is an
  end of both. Loops can touch at a shared corner.

## Colliding with a chain

Bodies collide with a chain's edges, from the side each edge's normal
faces. A body touching several edges gets a separate collision manifold
for each edge. Each edge's neighbors in its loop decide which edge a
contact near their shared point belongs to, so a body sliding along a
floor made of many edges is pushed only along the floor's normal and
doesn't catch where two edges meet. A body in a corner where two edges
meet at an inward angle gets a contact from each edge.

An edge doesn't push a body whose center is behind it, on the solid side.
For a polygon, the center is its center of mass, and an edge still pushes
it while its center is in front of a neighbor that meets the edge at an
outward corner, so a box balanced on a platform's corner stays on the
platform. A body that is inside solid doesn't collide with the edges
around it, and a wall thinner than a body never pushes the body out of
both sides at once.

:::caution
A body that moves more than half its size into a chain in one tick has
its center behind the edge it hit, and passes through it.
[Continuous Collision Detection](./continuous-collision-detection.md)
stops fast circles at a chain's edges; polygon bodies aren't swept, so
make walls thicker than the distance a fast polygon moves in one tick.
:::

The collider keeps a tree of its edges' bounds, so collision detection
only tests the edges near each body, however many edges the chain has.

## Body types

A chain is for static and kinematic bodies: give its entity no
`RigidBodyEcsComponent`, or a `'static'` or `'kinematic'` one (see
[Body types](./rigid-bodies.md#body-types)). A chain has no mass, and a
`'dynamic'` body with a `ChainCollider` throws when it is simulated.

Two `ChainCollider`s, or a `ChainCollider` and a `TerrainCollider`, never
collide with each other, since neither can move in response.

## Raycasting against a chain

[`raycast`](./raycasting.md) hits a chain's edges from the side their
normals face, at the point where the ray enters solid, with that edge's
normal. A ray that starts inside solid passes out through the edge it
leaves by without hitting it, and hits the next edge where it enters solid
again.
