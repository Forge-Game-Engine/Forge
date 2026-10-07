---
sidebar_position: 3
---

# Raycasting

[`raycast(world, start, end, options?)`](/Forge/docs/api/functions/raycast)
tests the line segment from `start` to `end` against every entity in an
`EcsWorld` that has a `ColliderEcsComponent` and a `PositionEcsComponent`.
It returns a [`RaycastHit`](/Forge/docs/api/interfaces/RaycastHit) for
each collider the segment crosses. Use it to find what lies between two
points, for example for a line-of-sight check or a hitscan weapon.

## Casting a ray

```ts
import { raycast } from '@forge-game-engine/forge/physics';

const hits = raycast(world, start, end);
const closest = hits[0];

if (closest) {
  const { entity, point, normal, distance } = closest;
}
```

By default, the hits are ordered by `distance` from `start`, so the first
hit is the closest. Each hit has:

- `entity`: the entity whose collider the ray crossed.
- `point`: the world-space point where the ray crosses the collider's
  edge, closest to `start`.
- `normal`: the collider's outward surface normal at `point`.
- `distance`: the distance from `start` to `point`.

`raycast` tests circle, polygon and terrain colliders. A ray can enter a
terrain from any side, including from below.

:::caution
`raycast` skips every collider whose `aabb` doesn't overlap the ray, and
`createBroadPhaseEcsSystem` is the system that writes `aabb`. Register the
broad phase, and cast rays after it has run: a collider is tested where it
was when the broad phase last ran, and a collider added since then isn't
hit.
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
