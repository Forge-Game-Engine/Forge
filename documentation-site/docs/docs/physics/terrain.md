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
code, the same way the [physics demo](/Forge/demos/physics) hand-builds its
boundary walls out of `PolygonShape` and a sprite. A common approach is to
draw one sprite per segment: a thin rectangle spanning each pair of surface
points, rotated to match the slope and tinted a solid ground color via
[`getSharedWhiteTexture`](/Forge/docs/api/functions/getSharedWhiteTexture)
(a 1x1 white texture, so the sprite shader's tint multiplies through
unmodified). See the [physics demo](/Forge/demos/physics)'s
`create-terrain.ts` for a complete example, including computing each
segment's position, rotation, and width from the same `points`/`depth`
passed to `TerrainShape`.
