---
sidebar_position: 3
---

# Custom Materials

The default UI shader covers tint, border, corner radius, and opacity, but
some effects (gradients, noise, dissolve transitions, procedural patterns)
need a fully custom shader. [`createCustomUiRenderable`](/Forge/docs/api/functions/createCustomUiRenderable)
builds a `Renderable` from your own GLSL and instance-buffer layout, and
plugs into the same UI render system, batching, clipping, and layout
pipeline as the default shader.

## The shader contract

A custom UI vertex shader must:

- Accept the `u_projection` uniform (a `mat3`) and apply it to the final
  screen position.
- Accept per-instance `a_worldMat0`/`a_worldMat1`/`a_worldMat2` attributes
  (each a `vec3`, together encoding the element's 2D affine world matrix)
  and use them to transform the incoming quad vertex.
- If you want clipping to work, accept an `a_clipRect` attribute (`vec4`:
  x, y, width, height in screen pixels) and discard fragments outside it in
  the fragment shader, the same analytic test the default shader performs.

The most reliable way to satisfy this is to start from the engine's own
shader source and modify it, rather than writing the matrix and projection
math from scratch:

```ts
import { uiVertexShader, uiFragmentShader } from '@forge-game-engine/forge/ui';
```

**Always combine matrices as `matrix * vector`** (`u_projection * screenPos`,
`worldMatrix * vec3(coord, 1.0)`), matching the engine's `Matrix3x3` and TRS
convention, where translation lives in the matrix's last column. Writing
`vector * matrix` instead is mathematically `transpose(matrix) * vector`,
which silently drops translation unless the matrix happens to be symmetric.
A shader with this bug will render successfully (no GL errors, correct
instance counts in any metrics overlay) but every element appears at the
wrong position, or not at all if the camera/projection translates by a
non-zero amount, so it's easy to miss in testing with a centred camera.

## Defining the instance layout

`floatsPerInstance` and the matching `bindInstanceData`/
`setupInstanceAttributes` callbacks describe how your per-instance data is
packed into the GPU buffer. `bindInstanceData` receives the same
`{ transform, uiRenderable }` pair the default shader gets (a
`UiTransformEcsComponent` and a `UiRenderableEcsComponent`), not the
arbitrary entity, so a custom shader's only inputs are the world matrix,
resolved size, clip rect, and the standard tint/border/corner/opacity
fields. Define named offset constants for each field you read, the same way
the built-in layout does, rather than hardcoding offsets inline:

```ts
import { createCustomUiRenderable } from '@forge-game-engine/forge/ui';
import { setupInstanceAttribute } from '@forge-game-engine/forge/rendering';

const WORLD_MAT_0_OFFSET = 0;
const WORLD_MAT_1_OFFSET = 3;
const WORLD_MAT_2_OFFSET = 6;
const SIZE_OFFSET = 9;
const TINT_OFFSET = 11;
const FLOATS_PER_INSTANCE = 15;

const renderable = createCustomUiRenderable(renderContext, {
  vertexSource: dissolveVertexShader,
  fragmentSource: dissolveFragmentShader,
  floatsPerInstance: FLOATS_PER_INSTANCE,
  bindInstanceData: ({ transform, uiRenderable }, buffer, offset) => {
    buffer.set(transform.worldMatrix.matrix, offset + WORLD_MAT_0_OFFSET);
    buffer[offset + SIZE_OFFSET] = transform.resolvedRect.size.x;
    buffer[offset + SIZE_OFFSET + 1] = transform.resolvedRect.size.y;
    buffer[offset + TINT_OFFSET] = uiRenderable.tintColor.r;
    buffer[offset + TINT_OFFSET + 1] = uiRenderable.tintColor.g;
    buffer[offset + TINT_OFFSET + 2] = uiRenderable.tintColor.b;
    buffer[offset + TINT_OFFSET + 3] = uiRenderable.tintColor.a;
  },
  setupInstanceAttributes: (gl, renderable) => {
    const { program } = renderable.material;
    const stride = FLOATS_PER_INSTANCE * 4;

    setupInstanceAttribute(
      gl.getAttribLocation(program, 'a_worldMat0'),
      gl,
      3,
      stride,
      WORLD_MAT_0_OFFSET * 4,
    );
    // a_worldMat1 / a_worldMat2 follow the same pattern at their own offsets.
    setupInstanceAttribute(
      gl.getAttribLocation(program, 'a_size'),
      gl,
      2,
      stride,
      SIZE_OFFSET * 4,
    );
    setupInstanceAttribute(
      gl.getAttribLocation(program, 'a_tint'),
      gl,
      4,
      stride,
      TINT_OFFSET * 4,
    );
  },
});
```

This example repurposes `cornerRadius` and `borderWidth` for nothing, it
only forwards the world matrix, size, and tint, so a dissolve shader could
read `a_tint.a` as a per-element dissolve progress instead of plain opacity.
That's the workaround when a custom effect needs a parameter the default
fields don't model: reuse the numeric meaning of an existing field rather
than trying to add a new one, since `bindInstanceData` has no path to reach
arbitrary extra components on the entity.

## Gotchas

- **A custom renderable batches separately from everything else.** Batching
  groups consecutive entities that share the exact same `Renderable`
  instance, so every distinct custom shader you create is its own draw
  call, the same way a unique `zIndex` would be. This is the right tradeoff
  for a one-off effect (a single animated background panel), but don't
  create a new custom renderable per element if you want many elements with
  the same custom effect to batch, share one instance the same way you
  would with `createUiRenderable`.
- **You still attach the custom renderable through the same
  `UiRenderableEcsComponent`** (via `createUiPanel`'s `renderable` option,
  or by adding the component directly). Tint/border/corner-radius fields on
  that component are ignored unless your shader chooses to read the
  equivalent data from its own instance layout; they aren't applied for you.
- **Clipping is opt-in for custom shaders.** If you skip the `a_clipRect`
  attribute and discard test, your element ignores any ancestor
  `UiClipEcsComponent`, scroll groups, masks, anything, and renders outside
  its container's bounds. See [Clipping and Masking](./clipping-and-masking.md).
