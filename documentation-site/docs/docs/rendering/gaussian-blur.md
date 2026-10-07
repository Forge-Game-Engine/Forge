---
sidebar_position: 7
---

# Gaussian Blur

[`createGaussianBlurEcsSystem`](/Forge/docs/api/functions/createGaussianBlurEcsSystem)
is a two-pass separable Gaussian blur post-processing effect, built on the
render target/present pass plumbing described in
[Multipass Rendering](./multipass-rendering.md). Use it for anything that
calls for a softened scene: a pause menu background, a damage or
low-health vignette, a depth-of-field-style backdrop behind UI, or as a
starting point for your own blur-based effect ([Bloom](./bloom.md)'s
bright-pass blur chain uses this same separable technique).

It only affects cameras that have both a `renderTarget` and a
[`GaussianBlurEcsComponent`](/Forge/docs/api/interfaces/GaussianBlurEcsComponent)
(attach one with `addGaussianBlurComponent`); a camera missing either renders
untouched.

## Wiring it up

Following the rest of Forge's ECS conventions, blur settings are entity
data, not options baked into the system: `createGaussianBlurEcsSystem` takes
only a `RenderContext` and processes whichever cameras carry a
`GaussianBlurEcsComponent`. Give the camera a `renderTarget`, attach the
component with `addGaussianBlurComponent`, then register the blur system after the
render system and before the present system, since it reads what the render
system just drew and the present system draws whatever the blur system
leaves behind:

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

addGaussianBlurComponent(world, camera, { passes: 4, intensity: 0.5 });

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createGaussianBlurEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

:::caution
Registration order matters here in a way it usually doesn't in Forge: the
blur system reads the camera's `renderTarget` as it was left by whichever
system last wrote to it, and writes the blurred result back into that same
target. Registering it before the render system blurs last frame's stale
contents; registering it after the present system blurs a frame too late to
ever be shown.
:::

Because it's just component data, you can retune it (or swap it entirely
for a different post-processing "profile") at any point after creation by
fetching the component and writing to it, the same way the space-shooter
demo's camera shake works:

```ts
import { gaussianBlurId } from '@forge-game-engine/forge/rendering';

const blur = world.getComponent(camera, gaussianBlurId)!;
blur.intensity = 0.1; // e.g. ease off the blur when a menu closes
```

If two cameras render into the _same_ `renderTarget` (for example a static
background camera layered under a shaking foreground camera), attach
`GaussianBlurEcsComponent` to only one of them: the blur system already
processes each distinct render target once per frame, so a second component
on the other camera would just be redundant, and it blurs both cameras'
output together, since by that point they're already composited into one
texture.

To blur only _some_ of a scene (for example a background, but not the
gameplay layer on top of it), give those cameras _separate_ render targets
instead of a shared one, and attach `GaussianBlurEcsComponent` only to the
one that should be blurred: see [Layering multiple render targets](./multipass-rendering.md#layering-multiple-render-targets).

## Same look on every display

The blur is sized in CSS pixels, not render target pixels: each tap of the
kernel is one CSS pixel apart, so a given `passes` value spreads the same
distance on screen at any
[`RenderContext.pixelRatio`](/Forge/docs/api/classes/RenderContext#pixelratio)
(see [High-DPI displays](./world-units-and-cameras.md#high-dpi-displays)). This
assumes the camera's `renderTarget` is sized to the canvas
(`renderContext.width`/`height`), as in the example above.

On a high-DPI display (`pixelRatio` above `1`) the blur chain doesn't run on
the full-resolution scene: it first averages the scene down to CSS-pixel
resolution, blurs that, and the last pass scales the result back up into the
camera's `renderTarget`. Stepping one CSS pixel across the full-resolution
texture instead would skip the texels in between (see the caution below).
Because the scene is already blurred by the time it's scaled back up, this
costs no visible sharpness, and it keeps the blur's cost close to what it is
on a standard display.

## Tuning strength: passes vs. intensity

There are two, deliberately different, knobs on
[`GaussianBlurEcsComponent`](/Forge/docs/api/interfaces/GaussianBlurEcsComponent):

- **`passes`** sets how soft the underlying blur _can_ be. Each pass reads
  the previous pass's (already blurred) result back out of the camera's
  `renderTarget` and writes further blurred into it. `passes` only takes
  whole numbers, so going from `1` to `2` is a comparatively large jump.
- **`intensity`** (`0` to `1`, default `1`) blends between the sharp,
  unblurred scene and the fully-blurred (`passes`-many-iterations) result.
  Use it to dial back a `passes` value that's the right _softness_ but too
  _strong_, continuously rather than in whole-pass steps: `intensity: 0.5`
  with `passes: 8` reads as a gentle, high-quality soft-focus; `passes: 8`
  alone (`intensity: 1`) reads as heavily blurred.

```ts
addGaussianBlurComponent(world, camera, { passes: 8, intensity: 0.4 });
```

`intensity: 0` or `passes: 0` skips the blur entirely: nothing is drawn and
no internal buffers are allocated. `intensity: 1` is the cheapest non-zero
setting: it skips the blend pass, and the last blur pass writes the camera's
`renderTarget` directly.

:::caution
Each individual pass only samples 9 adjacent texels (one CSS pixel apart, see above), so `passes` (or
blending toward the sharp image via `intensity`) are the _only_ supported
ways to change blur strength: don't try to widen the blur by spacing the
samples further apart (for example scaling the texel-size uniform) instead.
Spacing samples out skips over the texels in between rather than averaging
them in, which produces visible ring-shaped banding instead of a smooth
blur, since a handful of widely-spaced point samples no longer reconstructs
the image well. Repeating the same narrow, well-sampled kernel is what
stays smooth as the blur gets stronger.
:::

If you need a much stronger blur than a reasonable number of `passes` can
give you cheaply, downsampling the scene into a smaller render target
before blurring (and upsampling after) is the usual next step, since it
lets each pass cover more visual area per texel without under-sampling.

## Performance note

Each pass costs two full-screen draws (9 texture samples per fragment), so
total cost scales linearly with `passes`. The blur passes run at CSS-pixel
resolution (`sceneTarget.width / pixelRatio` by `sceneTarget.height /
pixelRatio` fragment shader invocations each), so they cost about the same
on a high-DPI display as on a standard one; only the last draw, which
writes back into the full-resolution `renderTarget`, and, when `pixelRatio`
is above `1`, one extra draw that averages the scene down first, scale with
the display's resolution. A fractional `intensity` (anything other than
exactly `0` or `1`) adds one more full-screen draw regardless of `passes`,
which blends the sharp scene against the blurred result as a
[post-processing pass](./multipass-rendering.md#writing-a-post-processing-effect)
over the camera's `renderTarget` (allocating that target's second color
buffer the first time). There's also one lazily-allocated internal
[`PingPongTarget`](/Forge/docs/api/classes/PingPongTarget) pair (at
CSS-pixel resolution) per distinct render target the first time it's blurred, resized (or recreated)
automatically if that target's dimensions change, and disposed automatically
when the world stops. Because every pass and helper draw share materials
(and the compiled shader programs backing them) by source, via
