---
sidebar_position: 2
---

# Gaussian Blur

[`createGaussianBlurEcsSystem`](/Forge/docs/api/functions/createGaussianBlurEcsSystem)
is a two-pass separable Gaussian blur post-processing effect, built on the
render target/present pass plumbing described in
[Multipass Rendering](./multipass-rendering.md). Use it for anything that
calls for a softened scene: a pause menu background, a damage or
low-health vignette, a depth-of-field-style backdrop behind UI, or as a
starting point for your own blur-based effect (bloom's bright-pass
downsample chain uses the same separable technique).

It only affects cameras that have both a `renderTarget` and a
[`GaussianBlurEcsComponent`](/Forge/docs/api/interfaces/GaussianBlurEcsComponent)
(attach one with `addGaussianBlur`); a camera missing either renders
untouched.

## Wiring it up

Following the rest of Forge's ECS conventions, blur settings are entity
data, not options baked into the system: `createGaussianBlurEcsSystem` takes
only a `RenderContext` and processes whichever cameras carry a
`GaussianBlurEcsComponent`. Give the camera a `renderTarget`, attach the
component with `addGaussianBlur`, then register the blur system after the
render system and before the present system, since it reads what the render
system just drew and the present system draws whatever the blur system
leaves behind:

```ts
import {
  addCamera,
  addGaussianBlur,
  createGaussianBlurEcsSystem,
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

const camera = addCamera(world, { renderTarget: sceneTarget });

addGaussianBlur(world, camera, { passes: 4, intensity: 0.5 });

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

If two cameras render into the *same* `renderTarget` (for example a static
background camera layered under a shaking foreground camera), attach
`GaussianBlurEcsComponent` to only one of them: the blur system already
processes each distinct render target once per frame, so a second component
on the other camera would just be redundant, and it blurs both cameras'
output together, since by that point they're already composited into one
texture.

To blur only *some* of a scene (for example a background, but not the
gameplay layer on top of it), give those cameras *separate* render targets
instead of a shared one, and attach `GaussianBlurEcsComponent` only to the
one that should be blurred: see [Layering multiple render targets](./multipass-rendering.md#layering-multiple-render-targets).

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
addGaussianBlur(world, camera, { passes: 8, intensity: 0.4 });
```

`intensity: 0` skips the blur entirely (cheaper than `passes: 0`, since it
also skips allocating the internal scratch buffers on first use). `intensity:
1` is the cheapest non-zero setting: it skips the extra blend/copy pass
entirely and behaves exactly like earlier versions of this system that only
had `passes`.

:::caution
Each individual pass only samples 9 adjacent texels, so `passes` (or
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

Each pass costs two full-screen draws (`sceneTarget.width *
sceneTarget.height` fragment shader invocations each, 9 texture samples
per fragment), so total cost scales linearly with `passes`. A fractional
`intensity` (anything other than exactly `0` or `1`) adds three more
full-screen draws regardless of `passes`: one to snapshot the sharp scene
before blurring, one to blend it against the blurred result, and one to
copy that blend back into the camera's `renderTarget`. There's also one
lazily-allocated internal [`PingPongTarget`](/Forge/docs/api/classes/PingPongTarget)
pair (plus, for a fractional `intensity`, one more snapshot buffer) per
distinct render target the first time it's blurred, resized (or recreated)
automatically if that target's dimensions change, and disposed automatically
when the world stops. Because every pass and helper draw share materials
(and the compiled shader programs backing them) by source, via
