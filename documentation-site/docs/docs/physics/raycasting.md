---
sidebar_position: 3
---

# Raycasting

[`raycast(bodies, start, end, sort?)`](/Forge/docs/api/functions/raycast)
casts a line segment against a set of `RigidBody` instances and returns
every point where it intersects one, as
[`RaycastCollision`](/Forge/docs/api/interfaces/RaycastCollision). Use it for
hitscan weapons, line-of-sight checks, and ground/wall detection, anything
that needs to ask "what's between these two points?" without running a full
simulation step.

## Finding the closest hit

The default `sort: true` orders results by distance from `start`, so the
first result is the nearest body along the ray:

```ts
import { raycast } from '@forge-game-engine/forge/physics';

const hits = raycast(physicsWorld.bodies, origin, target);
const closest = hits[0];

if (closest) {
  const hitEntity = closest.body.userData as number;
  // closest.point and closest.normal describe where and how it was hit
}
```

If you only need a yes/no line-of-sight check and don't care which body is
nearest, pass `sort: false` to skip the sort.

:::caution
For circle-shaped bodies, `vertices` on the returned `RaycastCollision` is
always an empty array, since circles have no edges. Code that assumes
`vertices` has entries (for example, to compute a reflection along a hit
edge) needs a separate code path for circle hits.
:::

## Performance

Before testing a body's exact shape, `raycast` skips any body whose
[`aabb`](/Forge/docs/api/classes/RigidBody#aabb) doesn't overlap the ray's
bounding box. A long raycast across a wide world still checks every body's
AABB once, but the expensive per-shape intersection test only runs for
bodies the ray could plausibly hit, so casting against
`physicsWorld.bodies` is cheap as long as most bodies aren't near the ray.

If you need many raycasts per frame (for example, a shotgun spread or a
sensor array), each call repeats this AABB pass over the full body list; for
very large worlds, consider narrowing the `bodies` array you pass in to a
relevant subset first.
