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

The engine's sprite renderer draws rotated/scaled quads and has no built-in
terrain mesh renderer, so visualizing a `TerrainShape` is left to your game
code. Two approaches, from simplest to most capable, both demonstrated in
this repo:

### Quick and simple: one sprite bar per point

The [physics demo](/Forge/demos/physics) hand-builds its rolling-hill floor
out of ordinary sprites, the same way it builds its `PolygonShape` walls:
one thin, axis-aligned vertical bar per surface point, reaching from that
point down to the shared bottom edge, tinted a solid ground color via
[`getSharedWhiteTexture`](/Forge/docs/api/functions/getSharedWhiteTexture)
(a 1x1 white texture, so the sprite shader's tint multiplies through
unmodified). See its `create-terrain.ts` for the complete example,
including computing each bar's position and width from the same
`points`/`depth` passed to `TerrainShape`.

:::caution
Render one rotated rectangle **per segment** instead (each one's top edge
matching that segment's slope) and you'll get thin gaps of background
showing through at some of the joints: two neighboring segments only share
their exact top corners, so wherever the slope changes from one segment to
the next, their side edges diverge below that shared corner. Axis-aligned
bars, each a little wider than its point spacing so neighbors overlap,
avoid this regardless of how steeply the terrain slopes - see the
`barOverlap` in the demo's `create-terrain.ts`.
:::

This approach is quick to write and reuses the ordinary sprite pipeline
entirely, but it can't render a perfectly smooth diagonal edge (the bars are
always vertical) or independently-tiled textures along the slope.

### A real textured mesh: the Rolling Ball demo

The [Rolling Ball demo](/Forge/demos/rolling-ball) goes further: a much
longer course whose smooth silhouette comes from a Catmull-Rom spline
through sparse, randomly-placed control points (see its
`terrain-curve.ts`), densely sampled into both `TerrainShape`'s collision
points _and_ a triangulated render mesh - the same points drive both, so
what's drawn always matches exactly what the ball touches.

That mesh is textured with a custom shader (`terrain.vert`/`terrain.frag`)
rather than the sprite pipeline: two independently-tileable layers, a
"border" texture near the surface blending into a "fill" texture below it
over a configurable depth and blend width, each with its own tile size and
tint (see `CreateTerrainOptions` in its `create-terrain.ts`). Since this
mesh has an arbitrary vertex count - not the fixed six-vertices-per-quad the
sprite pipeline batches - it's drawn with its own direct, non-instanced
`gl.drawArrays` call (see `terrain-render.system.ts`) instead of going
through `createRenderEcsSystem`.

:::caution[Coexisting with the sprite pipeline]
A custom draw call like this runs as an ordinary `EcsSystem`, registered
_before_ `createRenderEcsSystem` so sprites (the ball) draw on top of the
terrain mesh underneath them. But `createRenderEcsSystem` clears its
destination the first time it's used each frame (see
`RenderContext.clearStrategy`), which would wipe out the terrain mesh drawn
just before it. The Rolling Ball demo sets `renderContext.clearStrategy =
CLEAR_STRATEGY.none` so neither system's automatic clear fires, and instead
does the frame's one real clear itself, first, in its own system - see the
comment on `renderContext.clearStrategy` in its `create-game.ts`.
:::

Textures meant to tile also need `REPEAT` wrapping, unlike the engine's
`createTextureFromImage` (which hardcodes `CLAMP_TO_EDGE`, correct for a
sprite frame that must never bleed into a neighboring frame in the same
atlas). The demo's `load-tiled-texture.ts` loads a texture with `REPEAT` on
both axes instead.
