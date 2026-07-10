---
sidebar_position: 1
---

# Multipass Rendering

By default, a camera draws its sprites straight onto the canvas.
[`RenderTarget`](/Forge/docs/api/classes/RenderTarget) lets a camera draw
into an off-screen texture instead, and `createPresentEcsSystem` blits that
texture back onto the canvas. On its own this is a no-op that just adds an
extra draw call, but it's the foundation any effect that needs to process a
whole rendered frame builds on: post-processing (blur, bloom, color
grading) and lighting (compositing a light buffer over the scene) both start
by rendering the scene to a texture instead of the screen.

If you don't need any of that, don't reach for this: leave
`CameraEcsComponent.renderTarget` unset and the camera renders directly to
the canvas exactly as before, with no extra passes or texture allocations.

## Rendering a camera off-screen

Give the camera a [`RenderTarget`](/Forge/docs/api/classes/RenderTarget)
sized to the area you want to render into, and register
`createPresentEcsSystem` after your render system so there's a pass that
draws the result:

```ts
import {
  addCamera,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
} from '@forge-game-engine/forge/rendering';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, renderContext } = createGame('game-container');

const sceneTarget = createRenderTarget(
  renderContext.gl,
  renderContext.width,
  renderContext.height,
);

addCamera(world, { renderTarget: sceneTarget });

world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

`createPresentEcsSystem` skips any camera without a `renderTarget`, so it's
safe to register once and mix cameras that render straight to the canvas
with cameras that render off-screen.

:::caution
`RenderContext.resize` only resizes the canvas and the default framebuffer's
viewport; it doesn't know about render targets owned by cameras. If you
resize the render context (for example on a window resize), also call
`sceneTarget.resize(renderContext.gl, renderContext.width, renderContext.height)`,
or the off-screen texture will stay at its old resolution while the canvas
grows or shrinks around it.
:::

## Layering multiple render targets

Cameras that render into *different* targets, and are all presented in the
same frame, get layered onto the canvas in ascending
`CameraEcsComponent.layer` order: the lowest layer clears the canvas and
replaces it outright, and every higher layer alpha-blends on top instead of
erasing what came before. This is how you apply an effect to only part of a
scene, for example blurring a background layer while keeping a foreground
layer sharp:

```ts
const backgroundTarget = createRenderTarget(
  renderContext.gl,
  renderContext.width,
  renderContext.height,
);
const foregroundTarget = createRenderTarget(
  renderContext.gl,
  renderContext.width,
  renderContext.height,
);

const background = addCamera(world, {
  cullingMask: layers.background,
  renderTarget: backgroundTarget,
  layer: 0,
});
addCamera(world, {
  cullingMask: layers.foreground,
  renderTarget: foregroundTarget,
  layer: 1,
});

addGaussianBlur(world, background, { passes: 4 });

world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createGaussianBlurEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

`layer` only matters between cameras with *different* render targets; it has
no effect on cameras that share one (already composited together before any
present pass sees them, see below) or that render straight to the canvas.

Only the background camera carries a `GaussianBlurEcsComponent`, so only
its target gets blurred; the foreground target is presented sharp, on top
of it. See the space-shooter demo for this pattern in a real scene.

This is different from giving multiple cameras the *same* `renderTarget`
(described above): that composites them together *before* any
post-processing pass sees the result, so an effect applied to the shared
target affects every camera that drew into it. Give cameras separate
targets specifically when you want a pass to affect one layer but not
another.

## Clearing

Binding a render target now actually clears it before drawing, based on
[`RenderContext.clearStrategy`](/Forge/docs/api/classes/RenderContext#clearstrategy).
This applies to the canvas too: every camera's pass clears its destination
first, so cameras no longer draw on top of whatever the previous camera (or
the previous frame) left behind. Set `clearStrategy` to `'none'` only if you
intentionally want passes to accumulate onto the same buffer, for example a
trail or motion-blur effect built by deliberately not clearing.

## Ping-ponging between two buffers

A single render target is enough to move a camera's output off-screen, but
multi-step effects (successive blur passes, iterative light accumulation)
need to alternate between two buffers: read the previous step's result while
writing the next one, then swap. [`PingPongTarget`](/Forge/docs/api/classes/PingPongTarget)
holds that pair:

```ts
import { PingPongTarget } from '@forge-game-engine/forge/rendering';

const pingPong = new PingPongTarget(
  renderContext.gl,
  renderContext.width,
  renderContext.height,
);

// Each step of a multi-pass effect samples `pingPong.read` and draws into
// `pingPong.write`, then calls `pingPong.swap()` before the next step.
```

[Gaussian Blur](./gaussian-blur.md) is the first built-in post-processing
effect built on `PingPongTarget`; its two-pass horizontal/vertical blur is a
minimal example of the read/write/swap pattern above.

## Writing your own full-screen pass

Every full-screen pass (a post-processing step, or presenting a render
target) needs the same handful of steps: bind and clear the destination,
disable blending so the pass replaces every pixel instead of blending with
whatever was there, then draw a full-screen quad with a material. Two
helpers cover the mechanical parts so a custom pass only has to supply the
material and its uniforms:

```ts
import {
  beginFullscreenReplacePass,
  drawFullscreenQuad,
} from '@forge-game-engine/forge/rendering';

// destination is a RenderTarget, or null to draw onto the canvas
beginFullscreenReplacePass(renderContext, destination);

material.setUniform('u_texture', sourceTexture);
drawFullscreenQuad(renderContext, material);
```

`createGaussianBlurEcsSystem` uses these for its horizontal, vertical, copy,
and cross-fade passes; `createPresentEcsSystem` uses `drawFullscreenQuad`
too, but manages blending itself since layering multiple render targets onto
the canvas needs blending enabled for every layer after the first (see
[Layering multiple render targets](#layering-multiple-render-targets)
above).
