---
sidebar_position: 2
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
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  createCamera,
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

createCamera(world, { renderTarget: sceneTarget });

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

`createPresentEcsSystem` skips any camera without a `renderTarget`, so it's
safe to register once and mix cameras that render straight to the canvas
with cameras that render off-screen. Whatever a canvas camera drew is kept,
and every presented render target is blended on top of it, so a camera that
renders straight to the canvas always ends up _beneath_ every off-screen
one. This is what lets a screen-space UI canvas (which always renders
through its own render target, see
[Creating a Canvas](../ui/creating-a-canvas.md)) sit on top of a world camera
that has no render target of its own.

:::caution
`RenderContext.resize` only resizes the canvas and the default framebuffer's
viewport; it doesn't know about render targets owned by cameras. If you
resize the render context (for example on a window resize), also call
`sceneTarget.resize(renderContext.gl, renderContext.width, renderContext.height)`,
or the off-screen texture will stay at its old resolution while the canvas
grows or shrinks around it.
:::

## Layering multiple render targets

Cameras that render into _different_ targets, and are all presented in the
same frame, get layered onto the canvas in ascending
`CameraEcsComponent.layer` order: the lowest layer clears the canvas and
replaces it outright, and every higher layer alpha-blends on top instead of
erasing what came before. (If a camera also renders straight to the canvas,
the lowest layer blends on top of that camera's output too, rather than
replacing it.) This is how you apply an effect to only part of a scene, for
example blurring a background layer while keeping a foreground layer sharp:

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

const background = createCamera(world, {
  cullingMask: layers.background,
  renderTarget: backgroundTarget,
  layer: 0,
});
createCamera(world, {
  cullingMask: layers.foreground,
  renderTarget: foregroundTarget,
  layer: 1,
});

addGaussianBlurComponent(world, background, { passes: 4 });

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createGaussianBlurEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

`layer` only matters between cameras with _different_ render targets; it has
no effect on cameras that share one (already composited together before any
present pass sees them, see below) or that render straight to the canvas
(always beneath every presented target, see above).

Only the background camera carries a `GaussianBlurEcsComponent`, so only
its target gets blurred; the foreground target is presented sharp, on top
of it. See the space-shooter demo for this pattern in a real scene.

This is different from giving multiple cameras the _same_ `renderTarget`
(described above): that composites them together _before_ any
post-processing pass sees the result, so an effect applied to the shared
target affects every camera that drew into it. Give cameras separate
targets specifically when you want a pass to affect one layer but not
another.

## Transparency

A translucent sprite looks the same whether its camera renders straight to
the canvas or into a render target that's presented afterwards: a sprite
tinted to 50% alpha covers 50% of whatever is beneath it on screen either
way, including when it's in a higher layer (a HUD, for example) composited
over a lower one.

To make that hold, every render target and the canvas itself store
**premultiplied alpha**: each pixel's color is already multiplied by its
alpha. You only need to know this if you write your own shaders or passes:

- **Sprite and text shaders output straight (non-premultiplied) alpha**, as
  usual. `createRenderEcsSystem` premultiplies color as it blends it into
  the destination, so a custom `Material` used for sprites doesn't need to
  do anything differently.
- **Anything that reads a render target's `colorTexture` gets
  premultiplied color.** A full-screen pass that filters or mixes it
  (blurring, cross-fading) works on it as-is. A pass that needs the
  original, straight color (for example a color-grading lookup) has to
  divide by alpha first, and multiply it back in before writing.
- **To blend a premultiplied texture over a destination**, the way
  `createPresentEcsSystem` layers render targets, use
  `gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)`. The usual
  `gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)` would multiply the
  texture's alpha in a second time and make translucent pixels fainter than
  they were drawn.
- **Clear colors are straight alpha.** `CameraEcsComponent.clearColor` and
  `RenderContext.clear` take an ordinary `Color`, and premultiply it when
  they clear the destination.

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

`createGaussianBlurEcsSystem` uses these for its downsample and blur
passes; `createPresentEcsSystem` uses `drawFullscreenQuad`
too, but manages blending itself, since layering render targets onto the
canvas needs premultiplied-alpha blending for every layer after the first,
and for the first as well when a camera has already drawn straight onto the
canvas (see [Layering multiple render targets](#layering-multiple-render-targets)
and [Transparency](#transparency) above).

A pass like this can't use the same render target as both its source and
its destination, because a draw can't sample the texture it writes. To
process a camera's own target, use `beginPostProcessPass` instead (see
below).

## Writing a post-processing effect

A post-processing effect reads a camera's render target and writes the
result back into the same target. `beginPostProcessPass` does this without
an intermediate copy: each [`RenderTarget`](/Forge/docs/api/classes/RenderTarget)
has two color buffers, and every post-processing pass reads one and writes
the other.

```ts
import {
  beginPostProcessPass,
  drawFullscreenQuad,
} from '@forge-game-engine/forge/rendering';

const source = beginPostProcessPass(renderContext, camera.renderTarget);

effectMaterial.setUniform('u_texture', source);
drawFullscreenQuad(renderContext, effectMaterial);
```

[`beginPostProcessPass`](/Forge/docs/api/functions/beginPostProcessPass)
makes the target's other buffer current, binds and clears it, disables
blending, and returns the texture that held the target's contents before
the call. The target allocates its second buffer the first time this runs
on it, and resizes and disposes it together with the first.

The material samples the returned texture. `camera.renderTarget.colorTexture`
is already the buffer being drawn into, so sampling it reads the cleared
destination instead of the scene. The pass has to write every pixel: a pixel
the draw doesn't cover stays cleared.

Sprites drawn into the target on the next frame, the next effect, and
`createPresentEcsSystem` all use the buffer the last pass wrote, so effects
chain in system registration order. Register an effect system after the
render system and before `createPresentEcsSystem`, the same as the built-in
effects. When several cameras share one render target, process it once per
frame: a second pass over the same target applies the effect twice.

:::note
`RenderTarget.colorTexture` and `RenderTarget.framebuffer` change every
time a post-processing pass runs on the target. Read them when drawing,
not once at setup: a material that keeps a target's `colorTexture` from an
earlier frame samples the wrong buffer.
:::
