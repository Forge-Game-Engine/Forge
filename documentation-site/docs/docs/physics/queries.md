---
sidebar_position: 3
---

# Queries

A query asks an `EcsWorld`'s broad phase which colliders are at a place,
and returns the result immediately. Physics has three:

- [`raycast(world, start, end, options?)`](/Forge/docs/api/functions/raycast)
  finds the colliders a line segment crosses, and where it crosses them.
- [`queryAabb(world, aabb, filter?)`](/Forge/docs/api/functions/queryAabb)
  finds the colliders whose bounds overlap a box.
- [`overlapPoint(world, point, filter?)`](/Forge/docs/api/functions/overlapPoint)
  finds the colliders whose shape contains a point.

## Casting a ray

`raycast` tests the line segment from `start` to `end` and returns a
[`RaycastHit`](/Forge/docs/api/interfaces/RaycastHit) for each collider the
segment crosses. Use it to find what lies between two points, for example
for a line-of-sight check or a hitscan weapon. `start` and `end` must be
finite; `raycast` throws otherwise. For a ray with no end, cast to a point
beyond everything it could hit.

```ts
import { raycast } from '@forge-game-engine/forge/physics';

const hits = raycast(world, start, end);
const closest = hits[0];

if (closest) {
  const { entity, point, normal, distance } = closest;
}
```

By default, the hits are ordered by `distance` from `start`, so the first
hit is the closest. With the `sort` option set to `false`, they aren't
sorted and come in no particular order, which is cheaper when you only
check whether anything was hit. Each hit has:

- `entity`: the entity whose collider the ray crossed.
- `point`: the world-space point where the ray crosses the collider's
  edge, closest to `start`.
- `normal`: the collider's outward surface normal at `point`.
- `distance`: the distance from `start` to `point`.

`raycast` tests circle, polygon, terrain and chain colliders. A ray can
enter a terrain from any side, including from below. A ray hits a
[chain](./chain-colliders.md#raycasting-against-a-chain) only where it
enters solid, so a ray that starts inside a chain's solid doesn't hit the
edge it leaves by.

## Finding colliders in a box

`queryAabb` returns the entities whose collider's bounds overlap a
world-space box, touching included.
Use it for box selection, or to find what's near a point before testing
each result yourself.

```ts
import { queryAabb } from '@forge-game-engine/forge/physics';

const selected = queryAabb(world, {
  min: { x: 100, y: 50 },
  max: { x: 300, y: 200 },
});
```

`queryAabb` tests bounds only, not shapes: a circle is found when the box
overlaps a corner of its bounding square that the circle doesn't reach.
The box's sides may be infinite, and `queryAabb` throws for a `NaN`
coordinate or a box whose `min` is greater than its `max`. The entities
come in no particular order.

## Finding colliders at a point

`overlapPoint` returns the entities whose collider's shape contains a
world-space point, its boundary included. Use it to find the body under
the cursor, or to check that a spawn point is clear.

```ts
import { overlapPoint } from '@forge-game-engine/forge/physics';
import { getCameraView } from '@forge-game-engine/forge/rendering';

const cursor = getCameraView(world, camera, renderContext).viewportToWorld(
  mousePosition,
);
const underCursor = overlapPoint(world, cursor);
```

`point` must be finite; `overlapPoint` throws otherwise. The entities come
in no particular order. What a collider contains depends on its type:

- A circle or polygon contains its area.
- A [terrain](./terrain.md) contains its whole slab, between the surface
  and its flat bottom, over the surface's x range.
- A [chain](./chain-colliders.md) contains its solid side: the points its
  loops' winding marks solid, by the same rule navigation baking blocks
  cells by.

To test one entity's collider without the broad phase, call
[`colliderContainsPoint(body, point)`](/Forge/docs/api/functions/colliderContainsPoint)
with the collider and the position and rotation to test it at.

:::caution
`overlapPoint` only tests colliders whose bounds contain the point. A
chain whose loop with the largest area is a hole
(`ChainCollider.outsideIsSolid`) is solid everywhere outside its loops, but
`overlapPoint` only finds it at points inside its bounds.
`colliderContainsPoint` and navigation baking treat the points beyond the
bounds as solid. Surround the hole with a solid loop to give the solid
bounds.
:::

## Which pose a query tests

Every query tests each collider at its simulated pose:

- A collider on a dynamic or kinematic body is tested at the body's
  `position.local` and `rotation.local`: where the latest fixed step left
  it, or where game code has since placed it. Its bounds are computed from
  that pose. Bodies are drawn between their last two fixed steps (see
  [Interpolating between fixed steps](../common/transforms.md#interpolating-between-fixed-steps)),
  so a query can find a moving body up to one step ahead of where the body
  is drawn.
- Every other collider is tested at its `position.world` and
  `rotation.world`, with its `ColliderEcsComponent.aabb` as its bounds.

## What a query sees

Each query walks the [broad phase](./collisions.md#finding-colliding-pairs)'s
[dynamic AABB trees](./dynamic-aabb-tree.md), so it only looks at
colliders near the segment, box or point. Its cost grows with the number of
colliders near the query, not with the number of colliders in the world.
`raycast` and `overlapPoint` only test the exact shape of colliders whose
bounds the segment or point reaches.

:::caution
Every query throws if the world has no broad phase. Call
`createBroadPhase(world)`, register `createBroadPhaseEcsSystem`, and query
after it has run. The trees and each collider's `aabb` are as of the broad
phase's last run, which is once per fixed step: a collider is found where it
was then, a collider added since then isn't found, and one removed since
then isn't found either. The broad phase runs before the step moves the
bodies, so a query after the step can miss a dynamic or kinematic body that
has moved more than a tenth of a world unit since. A query from the default
group or an event handler finds the colliders as of the latest fixed step,
and on the frames before the first fixed step it finds nothing.
:::

## Choosing which colliders a query finds

Every query takes the same
[`PhysicsQueryFilter`](/Forge/docs/api/interfaces/PhysicsQueryFilter)
options. `mask` limits the query to colliders whose `category` shares a bit
with it, the same categories colliders filter each other by (see
[Filtering which colliders collide](./collisions.md#filtering-which-colliders-collide)).
By default it finds every category.

```ts
const STATIC_GEOMETRY = 1 << 0;

const blockingHits = raycast(world, start, end, { mask: STATIC_GEOMETRY });
const hasLineOfSight = blockingHits.length === 0;
```

A query skips [sensor colliders](./collisions.md#sensors) unless the
`includeSensors` option is `true`.
