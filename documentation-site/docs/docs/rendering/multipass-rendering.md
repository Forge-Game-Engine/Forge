---
sidebar_position: 7
---

# Render Targets

A [`RenderTarget`](/Forge/docs/api/classes/RenderTarget) is an off-screen
texture that a camera draws into instead of the canvas.
[`createPresentEcsSystem`](/Forge/docs/api/functions/createPresentEcsSystem)
draws each camera's render target onto the canvas. Between the two,
post-processing effects (such as [Gaussian blur](./gaussian-blur.md),
[bloom](./bloom.md) and [tone mapping](./hdr-rendering.md)) read the
rendered frame from the target and write the processed frame back into it.

A camera without a `renderTarget` draws straight onto the canvas.

## Rendering a camera into a render target

Create a render target with
[`createRenderTarget`](/Forge/docs/api/functions/createRenderTarget), give
it to the camera, and register `createPresentEcsSystem` after the render
system:

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  createCamera,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
} from '@forge-game-engine/forge/rendering';

const sceneTarget = createRenderTarget(renderContext, 'canvas');

createCamera(world, { renderTarget: sceneTarget });

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

`createPresentEcsSystem` skips cameras without a `renderTarget`, so cameras
that draw onto the canvas and cameras that draw into render targets can be
used together. The present system draws every render target over what the
canvas cameras drew, so a camera that draws straight onto the canvas is
always beneath every render target.

## Render target sizes

The second argument to `createRenderTarget` is the target's size:

- `'canvas'`: the render context's drawing buffer
  (`renderContext.width` by `renderContext.height`, in device pixels). The
  render context resizes the target whenever it resizes the canvas. Use it
  for a camera's target.
- `{ width, height }`: a fixed size in pixels, for a target with its own
  resolution. It keeps that size until you call `resize(width, height)` on
  it.

```ts
const fixedSizeTarget = createRenderTarget(renderContext, {
  width: 256,
  height: 256,
});
```

Calling `resize` on a canvas-sized target throws.

## Layering multiple render targets

The present system draws cameras' render targets onto the canvas in
ascending order of the cameras' `layer`. The lowest layer replaces the
canvas's contents, and each higher layer is blended over the layers below
it. When a camera also draws straight onto the canvas, the lowest layer is
blended over that camera's output instead of replacing it.

Separate render targets let an effect process one layer of the scene and
not another. Here a [Gaussian blur](./gaussian-blur.md) applies to the
background camera's target only, and the foreground target is presented
over it unblurred:

```ts
const renderCategories = {
  background: 1 << 0,
  foreground: 1 << 1,
};

const backgroundCamera = createCamera(world, {
  cullingMask: renderCategories.background,
  renderTarget: createRenderTarget(renderContext, 'canvas'),
  layer: 0,
});

createCamera(world, {
  cullingMask: renderCategories.foreground,
  renderTarget: createRenderTarget(renderContext, 'canvas'),
  layer: 1,
});

addGaussianBlurComponent(world, backgroundCamera, { passes: 4 });

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createGaussianBlurEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

A camera's `layer` only orders cameras with different render targets. It
doesn't affect cameras that draw onto the canvas.

## Sharing a render target between cameras

Cameras given the same `renderTarget` draw into it one after another in the
same frame, and the present system draws the target once. The first camera
that draws into the target in a frame clears it (see
[Setting the background color](./world-units-and-cameras.md#setting-the-background-color)).
An effect applied to a shared target processes everything the cameras drew
into it.

## Transparency

Every render target and the canvas store **premultiplied alpha**: each
pixel's color is already multiplied by its alpha. A translucent sprite
covers the same share of what's beneath it whether its camera draws onto
the canvas or into a render target that's presented later. This matters
when you write your own shaders or passes:

- **Sprite and text shaders output straight (not premultiplied) alpha.**
  `createRenderEcsSystem` premultiplies color as it blends it into the
  destination, so a
  [sprite material](./sprites.md#drawing-sprites-with-a-custom-shader)
  outputs straight alpha.
- **A render target's `colorTexture` holds premultiplied color.** A pass
  that filters or mixes it (blurring, cross-fading) works on it as it is. A
  pass that needs straight color (for example a color-grading lookup)
  divides by alpha first, and multiplies by it again before writing.
- **To blend a premultiplied texture over a destination**, the way
  `createPresentEcsSystem` layers render targets, use
  `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)`.
  `gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)` multiplies the
  texture's alpha in a second time and makes translucent pixels fainter
  than they were drawn.
- **Clear colors are straight alpha.** `CameraEcsComponent.clearColor` and
  `RenderContext.clear` take a `Color` with straight alpha, and premultiply
  it when they clear the destination.

## Writing a full-screen pass

A full-screen pass draws a quad over a whole destination with a material,
for example to copy one render target into another. Two functions do the
GL work:

```ts
import {
  beginFullscreenReplacePass,
  drawFullscreenQuad,
} from '@forge-game-engine/forge/rendering';

// destination is a RenderTarget, or null for the canvas
beginFullscreenReplacePass(renderContext, destination);

material.setUniform('u_texture', sourceTexture);
drawFullscreenQuad(renderContext, material);
```

[`beginFullscreenReplacePass`](/Forge/docs/api/functions/beginFullscreenReplacePass)
binds and clears the destination and turns off blending, so the pass
replaces every pixel.
[`drawFullscreenQuad`](/Forge/docs/api/functions/drawFullscreenQuad) binds
the material and draws the quad. [Materials](./material-uniforms.md) covers
creating the material and setting its uniforms.

A pass can't use one render target as both its source and its destination,
because a draw can't sample the texture it writes. To process a camera's
own target, use `beginPostProcessPass` (see
[Writing a post-processing effect](#writing-a-post-processing-effect)).

## Writing a post-processing effect

A post-processing effect reads a camera's render target and writes the
result back into the same target. Each `RenderTarget` has two color
buffers: [`beginPostProcessPass`](/Forge/docs/api/functions/beginPostProcessPass)
makes the target's other buffer current, binds and clears it, turns off
blending, and returns the texture that held the target's contents before
the call:

```ts
import {
  beginPostProcessPass,
  drawFullscreenQuad,
} from '@forge-game-engine/forge/rendering';

// cameraTarget is the camera's renderTarget
const source = beginPostProcessPass(renderContext, cameraTarget);

effectMaterial.setUniform('u_texture', source);
drawFullscreenQuad(renderContext, effectMaterial);
```

The material samples the returned texture. The target's `colorTexture` is
already the buffer being drawn into, so sampling it reads the cleared
buffer instead of the scene. The pass has to write every pixel: a pixel the
draw doesn't cover stays cleared.

Each effect, and then the present system, reads the buffer the previous
pass wrote, so effects run in system registration order. Register an effect
system after the render system and before `createPresentEcsSystem`. When
several cameras share one render target, process the target once per
frame: a second pass over the same target applies the effect twice.

:::note
`RenderTarget.colorTexture` and `RenderTarget.framebuffer` change every
time a post-processing pass runs on the target. Read them when drawing, not
once at setup: a `colorTexture` kept from an earlier frame is the wrong
buffer.
:::

## Alternating between two render targets

An effect made of several steps, such as the horizontal and vertical passes
of a blur, reads the previous step's result while it writes the next one.
[`PingPongTarget`](/Forge/docs/api/classes/PingPongTarget) holds two render
targets for this: each step samples `read`, draws into `write`, then calls
`swap()`:

```ts
import {
  beginFullscreenReplacePass,
  drawFullscreenQuad,
  PingPongTarget,
} from '@forge-game-engine/forge/rendering';

const pingPong = new PingPongTarget(renderContext, 'canvas');

beginFullscreenReplacePass(renderContext, pingPong.write);
stepMaterial.setUniform('u_texture', pingPong.read.colorTexture);
drawFullscreenQuad(renderContext, stepMaterial);
pingPong.swap();
```

After `swap()`, `read` is the target the step drew into.

## Disposing a render target

Call [`dispose`](/Forge/docs/api/classes/RenderTarget#dispose) on a render
target that's no longer used. It frees the target's framebuffers and color
textures. The render context keeps every canvas-sized target to resize it,
until the target is disposed.

```ts
sceneTarget.dispose();
```

`PingPongTarget.dispose` disposes both of its targets. Calling `update` or
`dispose` on a target's `colorTexture` throws (see
[Disposing a texture](./textures.md#disposing-a-texture)).
