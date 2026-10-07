---
sidebar_position: 6
---

# Terrain

`TerrainCollider` is a collision shape
for static 2D ground: a heightmap made of surface points, ordered left to
right, closed off into a solid slab by a flat bottom edge. Use it instead of
a `PolygonCollider` when your ground isn't a single convex box - rolling
hills, a canyon profile, or any left-to-right surface with more than one
slope.

```ts
import { Vec2 } from '@forge-game-engine/forge/math';
import {
  addColliderComponent,
  TerrainCollider,
} from '@forge-game-engine/forge/physics';

const groundEntity = world.createEntity();

addColliderComponent(world, groundEntity, {
  collider: new TerrainCollider(
    [
      { x: -400, y: 40 },
      { x: -200, y: -20 },
      { x: 0, y: 0 },
      { x: 200, y: -60 },
      { x: 400, y: 20 },
    ],
    200, // depth: how far the solid slab extends below the lowest point
  ),
});
```

Terrain is static, so `groundEntity` only needs `PositionEcsComponent`/
`RotationEcsComponent` (for `computeAabb`/narrow-phase to read `.world` from;
the rotation component is optional, and an entity without one is treated as
unrotated) and `ColliderEcsComponent` - no `RigidBodyEcsComponent`, the
same convention every other static body (walls, ground boxes) in this
engine follows. See the [Bodies and Shapes guide](/Forge/docs/docs/physics/rigid-bodies)
for that static/kinematic/dynamic distinction.

## Authoring points

`points` must have at least 2 entries and be ordered by strictly increasing
`x` - `TerrainCollider` throws otherwise. Like every collider's shape,
`points` are used exactly as authored, in the entity's local space, so the
easiest way to work
with terrain is to author points directly in world coordinates and leave the
owning entity's `PositionEcsComponent` at `Vec2.zero`.

`depth` sets how far the solid slab extends below (toward `-y`) the lowest
of `points`, closing the heightmap into a shape with well-defined
area/collision volume. Points authored as the ground's surface in world
coordinates, on an unrotated entity, give ground underneath them with no
rotation or flipping needed.
It only needs to be deep enough that nothing can tunnel through the bottom;
a few hundred units is typically more than enough headroom.

:::caution
`TerrainCollider` is intended for **static** bodies only - attach it with
`addColliderComponent` and no `RigidBodyEcsComponent`. A heightmap has no
natural mass distribution to simulate as a moving object; the collider's
mass data is computed from its slab for interface-completeness, but nothing
in the engine exercises a dynamic terrain body.
:::

## How collision works

Internally, `TerrainCollider` keeps the heightmap as a continuous chain of
**surface edges** (`surface`), one per consecutive pair of points, each with
its own outward normal. Collision only ever happens against that chain -
never against the solid slab underneath it, which exists purely to give the
shape a well-defined area, silhouette and bounding box.

`detectCollision` dispatches circle/polygon-vs-terrain collisions
(`detectCircleTerrainCollision`/`detectPolygonTerrainCollision`) by resolving
the other body against every surface edge whose stretch of ground it
actually reaches, and returns **one manifold per edge**. Two consequences
worth knowing:

- **Contact normals always come from the ground's surface.** A body never
  meets an interior boundary between two neighboring stretches of ground, so
  it can never be pushed sideways along ground it is resting on. This is the
  same idea as a Box2D chain shape: an edge's neighbors act as its "ghost"
  geometry, deciding which of two edges sharing a point owns a contact
  clamped to it, so the same physical contact is never reported twice with
  two different normals.
- **A wide body gets a stable, multi-contact manifold.** A wheel or chassis
  spanning several points keeps a separate contact against each stretch of
  ground it touches, each with its own feature id, so the solver
  warm-starts every one of them across ticks. Nothing has to pick a single
  "deepest" edge, so near-coplanar ground can't make two edges trade places
  from tick to tick and throw the accumulated impulses away.

The polygon path still runs the engine's own reference/incident face
clipping (the same code `detectPolygonPolygonCollision` uses), and the
circle path the same closest-feature logic as `detectCirclePolygonCollision`

- there's no separate "terrain physics" to reason about.

:::caution[Terrain is one-sided]
Because only the surface collides, a body that gets underneath the terrain
is pushed back up through it rather than out of the bottom, and one that has
passed entirely out of the bottom of the slab (further than `depth` below
the surface) has fallen through and stops colliding. Don't use a
`TerrainCollider` as a ceiling or as a platform you can hit from below - use
a `PolygonCollider` for those. Raycasting is unaffected: `raycastTerrain`
tests the whole solid, so a ray can still enter the slab from any direction.
:::

A fast circle landing on terrain can still sink into it, or pass through it,
within a single tick, before narrow-phase collision sees the contact.
[Continuous Collision Detection](./continuous-collision-detection.md) stops
it at the surface.

### Choosing a point spacing

Point spacing trades detail against solver work. A body resting across _n_
surface edges produces up to _n_ contacts (a circle produces one, or two in
a valley), and every one of them is solved every iteration, every tick. Very
fine spacing relative to the bodies rolling over it is the main way to make
terrain contact expensive - space points no more finely than the detail you
actually need, and let `buildTerrainCurve` do the visual smoothing.

Broad-phase culling (the `aabb` that `createBroadPhaseEcsSystem` writes onto
each collider) still computes one AABB for the whole collider via `computeAabb`, which for a long
terrain strip produces a large bounding box around the whole shape (the same
simplification a very wide/tall `PolygonCollider` makes). This doesn't
affect correctness, only how many pairs reach the narrow phase - for very
large worlds, prefer several shorter `TerrainCollider` bodies over one shape
spanning the whole level.

## Rendering

The engine's sprite renderer draws rotated/scaled quads and can't render a
heightmap's silhouette, so `@forge-game-engine/forge/rendering` ships a
small terrain-specific pipeline alongside `TerrainCollider`: a smooth curve
builder, a mesh builder, and a draw system. All three are demonstrated end
to end in the [Rolling Ball demo](/Forge/demos/rolling-ball).

### Building a smooth curve

[`buildTerrainCurve`](/Forge/docs/api/functions/buildTerrainCurve) turns a
handful of sparse control points into a long, natural-looking silhouette: a
Catmull-Rom spline through the control points (converted to an equivalent
sequence of cubic Beziers under the hood), densely sampled into a polyline.

```ts
import { Vec2 } from '@forge-game-engine/forge/math';
import { buildTerrainCurve } from '@forge-game-engine/forge/rendering';

const curvePoints = buildTerrainCurve(
  [
    { x: -400, y: 40 },
    { x: -200, y: -20 },
    { x: 0, y: 0 },
    { x: 200, y: -60 },
    { x: 400, y: 20 },
  ],
  20, // samplesPerSegment: how many points to sample between each pair of control points
);
```

Feed the same `curvePoints` into both `TerrainCollider` (mapping each
point's `.position` into the `Vector2[]` it expects) and the render mesh
below, so what's drawn always matches exactly what the body collides with:

```ts
const points = curvePoints.map((curvePoint) => curvePoint.position);
const terrainCollider = new TerrainCollider(points, 200);
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
import { Vec2 } from '@forge-game-engine/forge/math';
import {
  Color,
  createTerrainMesh,
  createTexture,
} from '@forge-game-engine/forge/rendering';

const borderImage = await renderContext.imageCache.getOrLoad('grass.png');
const fillImage = await renderContext.imageCache.getOrLoad('dirt.png');

const borderTexture = createTexture(renderContext, borderImage, {
  wrap: 'repeat',
});
const fillTexture = createTexture(renderContext, fillImage, { wrap: 'repeat' });

const mesh = createTerrainMesh(renderContext, {
  curvePoints,
  depth: 200, // must match the TerrainCollider's depth
  position: Vec2.zero, // must match the entity's PositionEcsComponent
  angle: 0, // must match the entity's RotationEcsComponent
  border: {
    texture: borderTexture,
    tileSize: { x: 160, y: 70 },
    tint: Color.white,
  },
  fill: {
    texture: fillTexture,
    tileSize: { x: 90, y: 90 },
    tint: Color.white,
  },
  borderWidth: 40,
  borderBlend: 14, // optional, defaults to 12
});
```

`createTerrainMesh` tiles each layer's texture across the terrain, so both
textures must be created with `wrap: 'repeat'` (see
[Sampling options](../rendering/textures.md#sampling-options));
`createTerrainMesh` throws for a texture with the default `wrap: 'clamp'`.
The mesh doesn't own the textures: dispose them yourself once no terrain
mesh uses them.

### Drawing the mesh

Since the mesh has an arbitrary vertex count - not the fixed
six-vertices-per-quad the sprite pipeline batches -
[`createTerrainRenderEcsSystem`](/Forge/docs/api/functions/createTerrainRenderEcsSystem)
draws it with its own direct, non-instanced `gl.drawArrays` call instead of
going through `createRenderEcsSystem`. It draws every entity with a
[`TerrainMeshEcsComponent`](/Forge/docs/api/interfaces/TerrainMeshEcsComponent)
(attached with
[`addTerrainMeshComponent`](/Forge/docs/api/functions/addTerrainMeshComponent)),
so a world can have any number of terrain meshes, each matched against
cameras via `category`/`cullingMask` exactly like a
[sprite's `category`](../rendering/sprites.md#choosing-which-cameras-draw-a-sprite).

```ts
import {
  addTerrainMeshComponent,
  createTerrainRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';

addTerrainMeshComponent(world, groundEntity, { mesh });

world.addSystem(createTerrainRenderEcsSystem(renderContext));
world.addSystem(createRenderEcsSystem(renderContext));
```

:::caution[Coexisting with the sprite pipeline]
Register the terrain system _before_ `createRenderEcsSystem` so sprites
draw on top of the terrain mesh underneath them. `createTerrainRenderEcsSystem`
manages `RenderContext.clearStrategy` itself: whenever there's at least one
`TerrainMeshEcsComponent` to draw, it sets `clearStrategy` to
`CLEAR_STRATEGY.none` and does the frame's one real clear itself, so
`createRenderEcsSystem`'s own clear becomes a no-op instead of wiping out
the terrain mesh drawn just before it. You never need to touch
`clearStrategy` yourself. See the Rolling Ball demo's `create-game.ts` for
the complete setup.
:::
