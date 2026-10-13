---
sidebar_position: 6.5
---

# Geometry

A [`Geometry`](/Forge/docs/api/classes/Geometry) is vertex data on the GPU:
one buffer per vertex attribute, and optionally an index buffer. It's drawn
with a [material](./material-uniforms.md) whose vertex shader declares the
same attributes. Sprites and full-screen passes draw the render context's
`quadGeometry`; a mesh of any other shape, such as a trail, a rope or
debug lines, is a geometry of its own.

## Creating a geometry

Each attribute has the name the vertex shader declares, its data as a
`Float32Array`, and its `size`, the number of floats per vertex:

```ts
import { Geometry } from '@forge-game-engine/forge/rendering';

const geometry = new Geometry(renderContext, {
  attributes: [
    {
      name: 'a_position',
      data: new Float32Array([0, 0, 1, 0, 0, 1]),
      size: 2,
    },
  ],
});
```

Every attribute holds the same number of vertices. That number is the
geometry's `vertexCount`, `3` here. The constructor throws if the
attributes hold different numbers of vertices.

## Choosing a topology

`topology` sets the primitives the vertices make up. It defaults to
`'triangles'`, where every three vertices are a triangle:

| Topology          | Primitives                                                             |
| ----------------- | ---------------------------------------------------------------------- |
| `'triangles'`     | Every three vertices are a triangle.                                   |
| `'triangleStrip'` | Every vertex after the first two is a triangle with the two before it. |
| `'lines'`         | Every two vertices are a line.                                         |
| `'lineStrip'`     | A line through every vertex in turn.                                   |
| `'points'`        | Every vertex is a point.                                               |

```ts
const ribbon = new Geometry(renderContext, {
  attributes: [{ name: 'a_position', data: positions, size: 2 }],
  topology: 'triangleStrip',
});
```

`buildRibbonMesh` builds a ribbon's vertices along a line; see
[Ribbon Meshes](./ribbon-meshes.md).

## Indexing vertices

`indices` lists which vertices make up the primitives, in order, so
primitives can share vertices. It's a `Uint16Array`, or a `Uint32Array`
for more than 65536 vertices:

```ts
const square = new Geometry(renderContext, {
  attributes: [
    {
      name: 'a_position',
      data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      size: 2,
    },
  ],
  indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
});
```

An indexed geometry draws all of its indices. A geometry without indices
draws its first `vertexCount` vertices in order.

## Drawing a geometry

Bind the material, then the geometry, then call `draw`:

```ts
material.bind(renderContext.gl);
geometry.bind(material);
geometry.draw();
```

`bind` binds the geometry's vertex array for the material's program, and
creates it the first time the geometry is drawn with that program. `draw`
draws nothing while the [WebGL context is lost](./context-loss.md).
`drawInstanced(instanceCount)` draws the geometry `instanceCount` times in
one draw call.

## Updating vertex data

`update` replaces the vertex data, and can be called every frame for a
mesh that changes shape:

```ts
const positions = new Float32Array(maxVertexCount * 2);

// Each frame, fill the first `vertexCount` vertices, then:
geometry.update({ vertexCount, attributes: { a_position: positions } });
```

- `vertexCount` is the number of vertices drawn. Only the first
  `vertexCount * size` floats of each attribute are uploaded, so one array
  can be filled again every frame.
- `attributes` names the attributes that changed. An attribute that's left
  out keeps its data, and `update` throws if it holds fewer than
  `vertexCount` vertices.
- `indices` replaces the indices of an indexed geometry. `update` throws
  if the geometry was created without indices.

`update` writes into the geometry's existing buffers, and creates no GPU
objects. A buffer that the new data doesn't fit grows to the next power of
two bytes, so a mesh that grows a little each frame is only reallocated
now and then. The first update of a buffer reallocates it once, as a
dynamic buffer; a geometry that's never updated keeps static buffers.

The geometry keeps a reference to the arrays it's given, not a copy, and
uploads their first `vertexCount` vertices again when a lost context is
restored. While the context is lost, `update` only records the data.

## Disposing a geometry

Whoever creates a geometry owns it, and calls `dispose` once nothing draws
it any more:

```ts
geometry.dispose();
```

`dispose` deletes the geometry's buffers and vertex arrays. The render
context's `quadGeometry` belongs to the render context; don't dispose it.
