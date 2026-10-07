---
sidebar_position: 8
---

# Gaussian Blur

Gaussian blur is a post-processing effect that blurs a camera's render
target, for example behind a pause menu or as a damage effect. A
[`GaussianBlurEcsComponent`](/Forge/docs/api/interfaces/GaussianBlurEcsComponent)
on a camera configures the blur, and
[`createGaussianBlurEcsSystem`](/Forge/docs/api/functions/createGaussianBlurEcsSystem)
draws it for every camera that has both a `renderTarget` and a
`GaussianBlurEcsComponent`. A camera missing either is drawn without blur.

## Blurring a camera

Give the camera a `renderTarget`, attach a `GaussianBlurEcsComponent` with
[`addGaussianBlurComponent`](/Forge/docs/api/functions/addGaussianBlurComponent),
and register `createGaussianBlurEcsSystem` after the render system and
before the present system:

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  addGaussianBlurComponent,
  createCamera,
  createGaussianBlurEcsSystem,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
} from '@forge-game-engine/forge/rendering';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, renderContext } = createGame('game-container');

const sceneTarget = createRenderTarget(renderContext, 'canvas');
const camera = createCamera(world, { renderTarget: sceneTarget });

const blur = addGaussianBlurComponent(world, camera, { passes: 4 });

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createGaussianBlurEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

The blur system reads the camera's `renderTarget` and writes the blurred
result back into it, and the present system draws the render target to the
canvas.

:::caution
Register the blur system after the render system and before the present
system. Registered before the render system, it blurs the previous frame's
contents. Registered after the present system, its result is never drawn to
the canvas.
:::

## Blur strength: passes and intensity

`GaussianBlurEcsComponent` has two fields:

- `passes`: how many times the scene is blurred. Each pass is a horizontal
  then a vertical blur over the result of the previous pass, so more passes
  give a softer, wider blur.
- `intensity` (`0` to `1`): how much of the blurred scene shows. `0` shows
  the sharp scene, `1` the fully blurred one, and values in between blend
  the two. Use it to weaken a blur by less than a whole pass.

```ts
addGaussianBlurComponent(world, camera, { passes: 8, intensity: 0.4 });
```

An `intensity` or `passes` of `0` draws no blur.

Each pass samples texels one CSS pixel apart, so a given `passes` value
blurs the same distance on screen at any
[`RenderContext.pixelRatio`](/Forge/docs/api/classes/RenderContext#pixelratio)
(see [High-DPI displays](./world-units-and-cameras.md#high-dpi-displays)).

## Changing the blur at runtime

`addGaussianBlurComponent` returns the component, and the blur system reads
it every frame, so a change to a field applies from the next frame:

```ts
blur.intensity = 0.1;
```

## Blurring part of a scene

Blur applies to a whole render target: everything drawn into a blurred
render target is blurred, whichever camera drew it. Two cameras that share a
render target need only one `GaussianBlurEcsComponent` between them.

To blur some cameras and not others (for example a background but not the
game world in front of it), give them separate render targets and attach a
`GaussianBlurEcsComponent` only to the camera that should be blurred. See
[Layering multiple render targets](./multipass-rendering.md#layering-multiple-render-targets).

## Removing a blur

Remove the component with `world.removeComponent(camera, gaussianBlurId)`.
The camera is drawn without blur from the next frame.
