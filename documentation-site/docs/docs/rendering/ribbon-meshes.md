---
sidebar_position: 6.8
---

# Ribbon Meshes

A ribbon is a strip of triangles along a line, with a width and a color at
each point of the line.
[`buildRibbonMesh`](/Forge/docs/api/functions/buildRibbonMesh) builds a
ribbon's vertices for a [geometry](./geometry.md) with the
`'triangleStrip'` topology. It touches no WebGL and allocates nothing once
its buffers are large enough, so it can run every frame.

## Ribbon points

A ribbon is built from an array of
[`RibbonPoint`](/Forge/docs/api/interfaces/RibbonPoint)s, in order along
the line:

```ts
import { Color, RibbonPoint } from '@forge-game-engine/forge/rendering';

const points: RibbonPoint[] = [
  { position: { x: 0, y: 0 }, width: 1, color: Color.white, distance: 0 },
  { position: { x: 4, y: 0 }, width: 1, color: Color.white, distance: 4 },
  { position: { x: 4, y: 3 }, width: 0.5, color: Color.white, distance: 7 },
];
```

- `position` is Y-up, in the space of the mesh that draws the ribbon (see
  [Drawing a ribbon](#drawing-a-ribbon)).
- `width` is the ribbon's full width at the point, in the same units. The
  edges run in straight lines between points, so the ribbon tapers between
  points of different widths.
- `color` is straight (not premultiplied) alpha. It's a `Color` or any
  object with `r`, `g`, `b` and `a`.
- `distance` is how far along the line the point is, in the same units. It
  sets the texture's U coordinate (see
  [Texture coordinates](#texture-coordinates)).

A point closer than `1e-4` units to the previous point that was kept is
skipped. The first and last points are always kept.

## Building a ribbon

[`createRibbonMeshBuffers`](/Forge/docs/api/functions/createRibbonMeshBuffers)
creates the arrays the vertices are written into, with room for a ribbon of
the given number of points. A geometry is created over them:

```ts
import {
  buildRibbonMesh,
  createRibbonMeshBuffers,
  Geometry,
} from '@forge-game-engine/forge/rendering';

const buffers = createRibbonMeshBuffers(64);
const geometry = new Geometry(renderContext, {
  attributes: [
    { name: 'a_position', data: buffers.positions, size: 2 },
    { name: 'a_texCoord', data: buffers.uvs, size: 2 },
    { name: 'a_color', data: buffers.colors, size: 4 },
  ],
  topology: 'triangleStrip',
});
```

`buildRibbonMesh` writes the ribbon into the buffers and returns the number
of vertices it wrote. Pass that count and the buffers to the geometry's
[`update`](./geometry.md#updating-vertex-data) before the geometry is first
drawn, and again each time the points change:

```ts
const vertexCount = buildRibbonMesh(
  points,
  { textureMode: 'stretch', miterLimit: 4 },
  buffers,
);

geometry.update({
  vertexCount,
  attributes: {
    a_position: buffers.positions,
    a_texCoord: buffers.uvs,
    a_color: buffers.colors,
  },
});
```

`vertexCount` is `0` when fewer than two of the points are distinct.

A ribbon of `n` points needs at most `4n − 4` vertices. When the buffers
can't hold that many, `buildRibbonMesh` replaces `buffers.positions`,
`buffers.uvs` and `buffers.colors` with larger arrays, so read them from
`buffers` after every call, as above.

:::caution
The geometry's constructor sets its `vertexCount` to every vertex the
buffers hold. Until the first `update`, it draws the unused zero vertices
too, as triangles to the origin.
:::

## Joins

At each point between the first and the last, the ribbon's edges meet at a
miter: the vertices are offset along the bisector of the two segments, far
enough that the ribbon keeps its width around the corner.

`miterLimit` is the longest a miter can be, as a multiple of the ribbon's
width at that point. A sharper turn is beveled: its outer corner is cut
straight across, so the ribbon doesn't spike at a sharp turn. `4` bevels
turns of more than about 151°, and `2` turns of more than 120°.

On the inner side of a turn, a vertex never reaches past the middle of
either segment next to it. Where the line curves more tightly than half the
ribbon's width, the inner edge is pulled in instead of folding over itself,
so the ribbon is narrower there.

The first and last points end the ribbon straight across their segment.

## Texture coordinates

V is `0` on the left edge, looking along the line, and `1` on the right.
On a ribbon running toward `+X`, a texture's top row is along the `+Y`
edge, the same way up as on a sprite.

U runs along the ribbon, by the `textureMode` option:

- `'stretch'`: U runs from `0` at the first point to `1` at the last, so
  the texture is stretched once over the ribbon.
- `'tile'`: U is `distance / tileLength`, so the texture repeats every
  `tileLength` units. Give the texture `wrap: 'repeat'`.

```ts
buildRibbonMesh(
  points,
  { textureMode: 'tile', tileLength: 2, miterLimit: 4 },
  buffers,
);
```

With `'tile'`, each point's `distance` decides which part of the texture
is drawn at that point. A point whose `distance` stays the same while the
line changes keeps the same part of the texture. When `distance` is
measured from the first point, the texture stays in place at the first
point, and the other points get new parts of it as their distances
change.

## Drawing a ribbon

A ribbon is drawn as a [mesh](./meshes.md): add the geometry to an entity
with a mesh material whose vertex shader declares the attributes the
geometry has:

```glsl
#version 300 es
#pragma forge name(ribbon.vert)
#pragma forge include(meshVertex)

in vec2 a_position;
in vec2 a_texCoord;
in vec4 a_color;

out vec2 v_texCoord;
out vec4 v_color;

void main() {
  vec2 world = meshWorldPosition(a_position);

  gl_Position = meshClipPosition(world);
  forwardMeshMask(world);
  v_texCoord = a_texCoord;
  v_color = a_color;
}
```

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { addMeshComponent } from '@forge-game-engine/forge/rendering';

const entity = world.createEntity();

addPositionComponent(world, entity, { local: { x: 0, y: 0 } });
addMeshComponent(world, entity, { geometry, material });
```

The points are in the entity's local space, so the ribbon moves with the
entity. For a ribbon along points in world space, put it on an entity at
the origin, with no rotation and a scale of `1`, as above. The fragment
shader multiplies its texture by `v_color` and outputs straight alpha,
like any mesh shader.
