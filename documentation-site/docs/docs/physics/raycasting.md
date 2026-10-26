---
sidebar_position: 3
---

# Raycasting

[`raycast(world, start, end, options?)`](/Forge/docs/api/functions/raycast)
tests the line segment from `start` to `end` against the colliders in an
`EcsWorld`'s broad phase. It returns a
[`RaycastHit`](/Forge/docs/api/interfaces/RaycastHit) for each collider the
segment crosses. Use it to find what lies between two points, for example
for a line-of-sight check or a hitscan weapon.

## Casting a ray

`start` and `end` must be finite; `raycast` throws otherwise. For a ray
with no end, cast to a point beyond everything it could hit.

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

## Which pose a ray tests

A ray tests each collider at its simulated pose:

- A collider on a dynamic or kinematic body is tested at the body's
  `position.local` and `rotation.local`: where the latest fixed step left
  it, or where game code has since placed it. Bodies are drawn between
  their last two fixed steps (see
  [Interpolating between fixed steps](../common/transforms.md#interpolating-between-fixed-steps)),
  so a hit on a moving body can be up to one step ahead of where the body
  is drawn.
- Every other collider is tested at its `position.world` and
  `rotation.world`.

## Which colliders a ray sees

`raycast` casts the segment through the
[broad phase](./collisions.md#finding-colliding-pairs)'s
[dynamic AABB trees](./dynamic-aabb-tree.md), the way Box2D and Godot cast
rays, so it only looks at colliders near the segment. Its cost grows with
the number of colliders near the ray, not with the number of colliders in
the world. Of those, it only tests the exact shape of colliders whose
bounds the segment reaches: a static collider's `aabb`, and for a dynamic
or kinematic body, bounds computed from the pose it's tested at.

:::caution
`raycast` throws if the world has no broad phase. Call
`createBroadPhase(world)`, register `createBroadPhaseEcsSystem`, and cast
rays after it has run. The trees and each collider's `aabb` are as of the
broad phase's last run, which is once per fixed step: a collider is found
where it was then, a collider added since then isn't hit, and one removed
since then isn't hit either. The broad phase runs before the step moves
the bodies, so a ray cast after the step can miss a dynamic or kinematic
body that has moved more than a tenth of a world unit since. A ray cast
from the default group or an event handler sees the colliders as of the
latest fixed step, and on the frames before the first fixed step it hits
nothing.
:::

## Choosing which colliders a ray hits

The `mask` option limits the ray to colliders whose `category` shares a bit
with it, the same categories colliders filter each other by (see
[Filtering which colliders collide](./collisions.md#filtering-which-colliders-collide)).
By default it hits every category.

```ts
const STATIC_GEOMETRY = 1 << 0;

const blockingHits = raycast(world, start, end, { mask: STATIC_GEOMETRY });
const hasLineOfSight = blockingHits.length === 0;
```

A ray passes through [sensor colliders](./collisions.md#sensors) unless the
`includeSensors` option is `true`.
