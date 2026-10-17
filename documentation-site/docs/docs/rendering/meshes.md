---
sidebar_position: 6.75
---

# Meshes

A mesh is a [geometry](./geometry.md) of any shape drawn on an entity, such
as terrain, a trail or a custom shape. The render system draws meshes in the
same [draw order](./draw-order.md) as sprites and text, so a mesh can be
behind one sprite and in front of another.

A mesh entity has a position and a
[`MeshEcsComponent`](/Forge/docs/api/interfaces/MeshEcsComponent), which
holds the geometry and a
[`MeshMaterial`](/Forge/docs/api/classes/MeshMaterial) to draw it with.

## Writing mesh shaders

A mesh material is a pair of shaders, registered in the render context's
shader cache:

- The vertex shader includes `meshVertex`. It passes each vertex position
  through `meshWorldPosition`, which applies the entity's world position,
  rotation and scale, then through `meshClipPosition`, which applies the
  camera's view, and passes the world position to `forwardMeshMask`.
- The fragment shader includes `mask` and multiplies its output alpha by
  `maskCoverage()`, so [masks](./masks.md) clip the mesh. Its output is
  straight alpha, like a sprite shader's.

```ts
import { ForgeShaderSource } from '@forge-game-engine/forge/rendering';

const flatVertexShader = `#version 300 es
#pragma forge name(flat.vert)
#pragma forge include(meshVertex)

in vec2 a_position;

void main() {
  vec2 world = meshWorldPosition(a_position);

  gl_Position = meshClipPosition(world);
  forwardMeshMask(world);
}`;

const flatFragmentShader = `#version 300 es
#pragma forge name(flat.frag)
precision mediump float;

uniform vec4 u_color;
out vec4 fragColor;

#pragma forge include(mask)

void main() {
  fragColor = vec4(u_color.rgb, u_color.a * maskCoverage());
}`;

renderContext.shaderCache
  .addShader(new ForgeShaderSource(flatVertexShader))
  .addShader(new ForgeShaderSource(flatFragmentShader));
```

Positions are in the engine's Y-down world: `+Y` is down the screen.

## Creating a mesh material

[`createMeshMaterial`](/Forge/docs/api/functions/createMeshMaterial) pairs
the two shaders by name:

```ts
import { Color, createMeshMaterial } from '@forge-game-engine/forge/rendering';

const material = createMeshMaterial(renderContext, 'flat.vert', 'flat.frag');

material.setColorUniform('u_color', new Color(0, 1, 0, 1));
```

It throws if the vertex shader doesn't include `meshVertex` or the
fragment shader doesn't include `mask`. A mesh's textures, colors and any
other values are the material's own [uniforms](./material-uniforms.md).
Materials made from the same shaders share one program, so meshes with
different textures each get a material of their own.

The render system sets `u_model`, `u_viewProjection` and the mask uniforms
for each mesh it draws. `setUniform` throws for them.

## Adding a mesh to an entity

[`addMeshComponent`](/Forge/docs/api/functions/addMeshComponent) puts a
geometry and a material on an entity:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { addMeshComponent, Geometry } from '@forge-game-engine/forge/rendering';

const geometry = new Geometry(renderContext, {
  attributes: [
    {
      name: 'a_position',
      data: new Float32Array([0, 0, 1, 0, 0, 1]),
      size: 2,
    },
  ],
});

const entity = world.createEntity();

addPositionComponent(world, entity, { local: { x: 100, y: 50 } });
addMeshComponent(world, entity, { geometry, material });
```

The geometry needs an `a_position` attribute of size 2 or 3, and
`addMeshComponent` throws without one. The render system draws the mesh
for every camera whose `cullingMask` matches the mesh's `category`, which
defaults to `1`, as for sprites and text.

An entity has at most one mesh. Put more meshes on child entities.

## Placing a mesh

The geometry's vertices are in the entity's local space. The render system
draws them through the entity's world position, rotation and scale, so the
mesh moves, turns and scales with its entity and its parents, like a
sprite. A mesh is mirrored with a negative scale.

## Drawing a section of a geometry

A mesh's `section` names one of its geometry's
[sections](./geometry.md#dividing-a-geometry-into-sections) by index, and
the mesh draws only that range. With `section: null`, the default, the mesh
draws the whole geometry as it is each frame.

Several entities can share one geometry and draw a section each. Each
entity sorts, culls and hides on its own, like any other mesh. For example,
props baked into one geometry, with a crate, a barrel and a lamp post as
sections 0, 1 and 2, drawn by three entities at the same position:

```ts
import { addPositionComponent } from '@forge-game-engine/forge/common';
import { addMeshComponent, Geometry } from '@forge-game-engine/forge/rendering';

const props = new Geometry(renderContext, {
  attributes: [{ name: 'a_position', data: propPositions, size: 2 }],
  indices: propIndices,
  sections: [crateRange, barrelRange, lampPostRange],
});

const crate = world.createEntity();
const barrel = world.createEntity();
const lampPost = world.createEntity();

for (const [section, entity] of [crate, barrel, lampPost].entries()) {
  addPositionComponent(world, entity);
  addMeshComponent(world, entity, { geometry: props, material, section });
}
```

`addMeshComponent` throws for a `section` the geometry doesn't have. The
render system throws, naming the entity, when it draws a mesh whose section
a later `update` removed.

## Ordering meshes with sprites and text

Meshes sort with sprites and text by the same keys: the mesh's own
`layer`, the entity's world order (see
[`DrawOrderEcsComponent`](/Forge/docs/api/interfaces/DrawOrderEcsComponent)),
Y for a camera with `ySort`, then hierarchy order:

```ts
import { addDrawOrderComponent } from '@forge-game-engine/forge/rendering';

addDrawOrderComponent(world, background, { order: -1 });
addDrawOrderComponent(world, entity, { order: 0 }); // the mesh
addDrawOrderComponent(world, ship, { order: 1 });
```

An entity's mesh draws before its own sprite, and its sprite before its
own text. See [Draw Order](./draw-order.md) for every key.

Sprites that would otherwise draw in one batch draw in two when a mesh
sorts between them.

## Sharing a draw call between meshes

Meshes that come one after another in the draw order draw in one draw call
when all of these hold:

- they have the same geometry and the same material;
- their entities have the same world position, rotation and scale, and the
  same [masks](./masks.md) above them;
- each draws a range that starts where the previous one ends, such as
  sections 0, 1 and 2 in that order;
- the geometry's topology is `'triangles'`, `'lines'` or `'points'`.
  Strip ranges always draw separately, since joining them would draw
  primitives across the join.

Anything that sorts between them, such as a sprite, splits their draw call
in two, and draws over the meshes before it and under the meshes after it.
A mesh outside the view isn't drawn, so it splits the call too. Two meshes
with `section: null` never share a call.

## Culling meshes outside the view

A mesh isn't drawn when its bounds, placed by the entity's transform, are
outside the camera's view, or outside the bounds of the masks above it. A
mesh with a section uses that section's `bounds`, and a mesh with
`section: null` uses its geometry's
[`bounds`](/Forge/docs/api/classes/Geometry#bounds). Both surround the
`a_position` of the vertices drawn, and are computed again after `update`
changes them. A mesh whose geometry has no vertices, or whose section has
no elements, isn't drawn.

A mesh under a hidden entity (see [Visibility](./visibility.md)) isn't
drawn.

## Changing a mesh's vertices

Call the geometry's `update` to change the mesh's shape (see
[Updating vertex data](./geometry.md#updating-vertex-data)). The render
system draws the new vertices on the next frame:

```ts
geometry.update({ vertexCount, attributes: { a_position: positions } });
```

## Removing a mesh

Remove the component, then dispose the geometry once nothing draws it:

```ts
import { meshId } from '@forge-game-engine/forge/rendering';

world.removeComponent(entity, meshId);
geometry.dispose();
```

Whoever creates a geometry owns it. Removing the component or the entity
doesn't dispose the geometry, so a geometry that several entities draw
sections of is disposed after removing all of their meshes. A component that creates its own geometry
disposes it from its
[remove hook](../ecs/component.md#releasing-what-a-component-holds), as
[trails](./trails.md) do.
