---
sidebar_position: 5
---

# Terrain

[`PolygonShape`](/Forge/docs/api/classes/PolygonShape) only supports convex
geometry, so there's no single shape for a curved or bumpy ground outline
like a hill. [`createTerrainBodies`](/Forge/docs/api/functions/createTerrainBodies)
builds that shape out of the pieces the engine already supports: it takes a
sampled curve and returns one thin, static, convex `RigidBody` segment per
consecutive pair of points, the same "decompose into convex pieces" approach
[Bodies and Shapes](./rigid-bodies.md#choosing-a-shape) recommends for any
concave outline.

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  createTerrainBodies,
  PhysicsWorld,
} from '@forge-game-engine/forge/physics';

const physicsWorld = new PhysicsWorld({ gravity: new Vector2(0, -300) });

// createTerrainBodies only builds the segments; sampling a curve into
// points (noise, a height field, hand-placed control points, ...) is
// game-specific and left to you.
const hillPoints: Vector2[] = [];

for (let x = 0; x <= 1000; x += 20) {
  hillPoints.push(new Vector2(x, 50 * Math.sin(x / 120)));
}

const terrainBodies = createTerrainBodies(hillPoints, {
  thickness: 20,
  friction: 0.8,
});

for (const body of terrainBodies) {
  physicsWorld.addBody(body);
}
```

Every generated body is `isStatic: true`, so there's no `density` option;
static bodies always have zero mass regardless of density, so exposing it
would just be a value that silently does nothing.

## Segment length and seams

Each pair of points becomes its own independent convex segment. A body
rolling across the seam where two segments meet can catch on the vertex
there, since narrow-phase collision treats every segment as its own
faceted shape rather than as part of one smooth curve.

:::caution
Keep segments short relative to the radius of anything expected to roll over
them (a wheel, a ball). A wheel much larger than a segment barely notices the
seam; a wheel comparable in size to a segment can visibly catch or bounce.
Sample `points` densely enough, especially through sharp curves, for this not
to matter in practice.
:::

For a wheel rolling over generated terrain as part of a full vehicle, see
[Building a Vehicle](./building-a-vehicle.md).
