---
sidebar_position: 6
---

# Terrain

[`TerrainShape`](/Forge/docs/api/classes/TerrainShape) is a collision shape
for static 2D ground: a heightmap made of surface points, ordered left to
right, closed off into a solid slab by a flat bottom edge. Use it instead of
a `PolygonShape` when your ground isn't a single convex box - rolling hills,
a canyon profile, or any left-to-right surface with more than one slope.

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import { RigidBody, TerrainShape } from '@forge-game-engine/forge/physics';

const groundBody = new RigidBody({
  shape: new TerrainShape(
    [
      new Vector2(-400, 40),
      new Vector2(-200, -20),
      new Vector2(0, 0),
      new Vector2(200, -60),
      new Vector2(400, 20),
    ],
    200, // depth: how far the solid slab extends below the lowest point
  ),
  isStatic: true,
});
```

## Authoring points

`points` must have at least 2 entries and be ordered by strictly increasing
`x` - `TerrainShape` throws otherwise. Unlike `PolygonShape`, it does **not**
re-center vertices around their centroid: `points` are used exactly as
authored, in the shape's own local space, so the easiest way to work with
terrain is to author points directly in world coordinates and leave the
owning body's `position` at `Vector2.zero`.

`depth` sets how far the solid slab extends below the lowest of `points`,
closing the heightmap into a shape with well-defined area/collision volume.
It only needs to be deep enough that nothing can tunnel through the bottom;
a few hundred units is typically more than enough headroom.

:::caution
`TerrainShape` is intended for **static** bodies only (`isStatic: true`). A
heightmap has no natural mass distribution to simulate as a moving object -
`getArea`/`getMomentOfInertia` are implemented for interface-completeness,
but nothing in the engine exercises a dynamic terrain body.
:::

## How collision works

Internally, `TerrainShape` triangulates the heightmap into one convex quad
per consecutive pair of points (`segments`), each spanning from the two
surface points down to the shared flat bottom edge. `PhysicsWorld` dispatches
circle/polygon-vs-terrain collisions by running the existing
circle-vs-polygon and polygon-vs-polygon narrow phase against whichever
segments overlap the other body's local x-range, then keeping the deepest
resulting contact. This means terrain collision reuses the same, already
battle-tested SAT code paths as `CircleShape`/`PolygonShape` - there's no
separate "terrain physics" to reason about, and any body that already
collides correctly with a `PolygonShape` floor collides correctly with a
`TerrainShape` one too.

Broad-phase culling (`RigidBody.aabb`) still uses `getBoundingRadius()`,
which for a long terrain strip produces a large, roughly-square bounding box
around the whole shape (the same simplification `PolygonShape` makes for any
elongated shape). This doesn't affect correctness, only how many pairs reach
the narrow phase - for very large worlds, prefer several shorter
`TerrainShape` bodies over one shape spanning the whole level.

## Rendering

The engine's sprite renderer draws rotated/scaled quads and can't render a
heightmap's silhouette, so `@forge-game-engine/forge/rendering` ships a
small terrain-specific pipeline alongside `TerrainShape`: a smooth curve
builder, a mesh builder, and a draw system. All three are demonstrated end
to end in the [Rolling Ball demo](/Forge/demos/rolling-ball).

### Building a smooth curve

[`buildTerrainCurve`](/Forge/docs/api/functions/buildTerrainCurve) turns a
handful of sparse control points into a long, natural-looking silhouette: a
Catmull-Rom spline through the control points (converted to an equivalent
sequence of cubic Beziers under the hood), densely sampled into a polyline.

```ts
import { Vector2 } from '@forge-game-engine/forge/math';
import { buildTerrainCurve } from '@forge-game-engine/forge/rendering';

const curvePoints = buildTerrainCurve(
  [
    new Vector2(-400, 40),
    new Vector2(-200, -20),
    new Vector2(0, 0),
    new Vector2(200, -60),
    new Vector2(400, 20),
  ],
  20, // samplesPerSegment: how many points to sample between each pair of control points
);
```

Feed the same `curvePoints` into both `TerrainShape` (mapping each point's
`.position` into the `Vector2[]` it expects) and the render mesh below, so
what's drawn always matches exactly what the body collides with:

```ts
const points = curvePoints.map((curvePoint) => curvePoint.position);
const terrainShape = new TerrainShape(points, 200);
```

[`heightAtLocalX`](/Forge/docs/api/functions/heightAtLocalX) looks up a
curve's interpolated surface height at a given local-space `x` - handy for
placing anything (a player's spawn point, a patrolling enemy) exactly on
the terrain's surface.

### Building the mesh

[`createTerrainMesh`](/Forge/docs/api/functions/createTerrainMesh)
triangulates `curvePoints` into a single mesh and textures it with two
independently-tileable layers: a "border" texture near the surface blending
into a "fill" texture below it, over a configurable depth and blend width,
each with its own tile size and tint.

```ts
import { Color, createTerrainMesh } from '@forge-game-engine/forge/rendering';

const borderImage = await renderContext.imageCache.getOrLoad('grass.png');
const fillImage = await renderContext.imageCache.getOrLoad('dirt.png');

const mesh = createTerrainMesh(renderContext, {
  curvePoints,
  depth: 200, // must match the TerrainShape's depth
  position: Vector2.zero, // must match the RigidBody's position
  angle: 0, // must match the RigidBody's angle
  border: {
    image: borderImage,
    tileSize: new Vector2(160, 70),
    tint: Color.white,
  },
  fill: {
    image: fillImage,
    tileSize: new Vector2(90, 90),
    tint: Color.white,
  },
  borderWidth: 40,
  borderBlend: 14, // optional, defaults to 12
});
```

`createTerrainMesh` loads each layer's texture with `REPEAT` wrapping on
both axes (rather than the `CLAMP_TO_EDGE` `createTextureFromImage` uses by
default for ordinary sprite frames, which must never bleed into a
neighboring frame in the same atlas) - pass `tile: true` to
`createTextureFromImage` directly if you ever need a tiled texture outside
this pipeline.

### Drawing the mesh

Since the mesh has an arbitrary vertex count - not the fixed
six-vertices-per-quad the sprite pipeline batches -
[`createTerrainRenderEcsSystem`](/Forge/docs/api/functions/createTerrainRenderEcsSystem)
draws it with its own direct, non-instanced `gl.drawArrays` call instead of
going through `createRenderEcsSystem`.

```ts
import { createTerrainRenderEcsSystem } from '@forge-game-engine/forge/rendering';

world.addSystem(createTerrainRenderEcsSystem(renderContext, mesh));
world.addSystem(createRenderEcsSystem(renderContext));
```

:::caution[Coexisting with the sprite pipeline]
Register the terrain system _before_ `createRenderEcsSystem` so sprites
draw on top of the terrain mesh underneath them. But `createRenderEcsSystem`
clears its destination the first time it's used each frame (see
`RenderContext.clearStrategy`), which would wipe out the terrain mesh drawn
just before it. Set `renderContext.clearStrategy = CLEAR_STRATEGY.none` so
neither system's automatic clear fires - `createTerrainRenderEcsSystem`
does the frame's one real clear itself, first. See the Rolling Ball demo's
`create-game.ts` for the complete setup.
:::
