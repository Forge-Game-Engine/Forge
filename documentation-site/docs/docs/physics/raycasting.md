---
sidebar_position: 3
---

# Raycasting

`raycast(world, start, end, sort?)`
casts a line segment against every entity in an `EcsWorld` with a
`ColliderEcsComponent` and returns every point where it intersects one, as
a `RaycastHit`. Use it for hitscan
weapons, line-of-sight checks, and ground/wall detection, anything that
needs to ask "what's between these two points?" without running a full
simulation step.

Try it in the [Raycasting demo](/Forge/demos/raycasting), which casts a ray
from a fixed point toward your cursor every time it moves.

## Finding the closest hit

The default `sort: true` orders results by distance from `start`, so the
first result is the nearest entity along the ray:

```ts
import { raycast } from '@forge-game-engine/forge/physics';

const hits = raycast(world, origin, target);
const closest = hits[0];

if (closest) {
  const { entity, point, normal, distance } = closest;
  // `point`/`normal` describe where and how it was hit, in world space
}
```

If you only need a yes/no line-of-sight check and don't care which entity
is nearest, pass `sort: false` to skip the sort.

`raycast` works against every collider shape - `CircleCollider`,
`PolygonCollider`, and `TerrainCollider` - dispatching to the appropriate
intersection test based on each entity's `Collider.type`.

## Performance

`raycast` reads each candidate entity's `AabbEcsComponent` directly rather
than recomputing it, so a system that updates it (for example
`createBroadPhaseEcsSystem`) must be registered and run at least once
before casting. Before testing an entity's exact collider shape, `raycast`
then skips any entity whose AABB doesn't overlap the ray's own bounding
box, so casting against a `world` with many entities is cheap as long as
most of them aren't near the ray.

If you need many raycasts per frame (for example, a shotgun spread or a
sensor array), each call repeats this AABB pass over every collider entity
in the world; for very large worlds, consider maintaining a smaller,
purpose-built `EcsWorld` (or a spatial index of your own) for the subset of
entities raycasts should actually be able to hit.
