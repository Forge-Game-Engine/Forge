---
sidebar_position: 5
---

# HDR Rendering & Tone Mapping

By default every [`RenderTarget`](/Forge/docs/api/classes/RenderTarget)
stores 8-bit-per-channel color: every value gets clamped to `[0, 1]` the
moment a fragment shader writes it, regardless of what the shader actually
computed. `RENDER_TARGET_FORMAT.hdr` switches a render target to half-float
(`RGBA16F`) storage instead, so values above `1` survive intermediate
passes — which matters for [Bloom](./bloom.md): a sprite tinted brighter
than white (e.g. `new Color(3, 3, 3)`), or one with an
[emissive map](./bloom.md#emissive-driven-bloom), can genuinely be brighter
than white, instead of hitting the same `1.0` ceiling as a plain white
sprite.
`createToneMapEcsSystem` then compresses that HDR range back into
displayable `[0, 1]` before the camera is presented.

## Opting a camera into HDR

Pass `RENDER_TARGET_FORMAT.hdr` when creating the camera's render target:

```ts
import {
  createCamera,
  createRenderTarget,
  RENDER_TARGET_FORMAT,
} from '@forge-game-engine/forge/rendering';

const sceneTarget = createRenderTarget(
  renderContext,
  'canvas',
  RENDER_TARGET_FORMAT.hdr,
);

const camera = createCamera(world, { renderTarget: sceneTarget });
```

`hdr` requires the `EXT_color_buffer_float` WebGL2 extension. If the
context doesn't support it, `RenderTarget` silently falls back to `ldr` —
the camera still renders correctly, just without HDR headroom. Everything
downstream (bloom, blur, tone mapping) already accounts for this: their
internal scratch buffers always match the source render target's actual
resolved `format`, not the format you asked for.

:::tip
Every other render target — a UI overlay camera, a minimap, anything that
doesn't need HDR — should stay at the `ldr` default. Half-float storage
costs roughly twice the bandwidth and memory of 8-bit storage for that
target and any post-processing scratch buffers built from it, so only opt
in where it's actually needed.
:::

## Tone mapping

An `hdr` render target has to be compressed back into `[0, 1]` before it's
displayable — presenting it unmapped just hard-clips highlights exactly
like the `ldr` default does. `createToneMapEcsSystem` does that compression,
configured per camera with [`ToneMappingEcsComponent`](/Forge/docs/api/interfaces/ToneMappingEcsComponent)
(attach one with `addToneMappingComponent`):

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  addToneMappingComponent,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createToneMapEcsSystem,
} from '@forge-game-engine/forge/rendering';

addToneMappingComponent(world, camera, { exposure: 1 });

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createToneMapEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

`ToneMappingEcsComponent` has two knobs:

- **`exposure`** (default `1`) multiplies the HDR color before the operator
  runs. Values above `1` brighten the whole image before highlights start
  rolling off; values below `1` darken it. Tune this the way you'd adjust a
  camera's exposure, rather than editing every light's brightness.
- **`operator`** (default `TONE_MAPPING_OPERATOR.aces`) picks the curve that
  compresses HDR color into `[0, 1]`:
  - `aces` — a cinematic filmic rolloff (the Narkowicz fit of the ACES
    curve). Highlights compress smoothly and stay roughly the right hue
    even well above `1`; the default for a reason.
  - `reinhard` — a simpler `color / (color + 1)` curve. Cheaper to reason
    about, but desaturates and flattens highlights faster than `aces`.

```ts
import { TONE_MAPPING_OPERATOR } from '@forge-game-engine/forge/rendering';

addToneMappingComponent(world, camera, {
  exposure: 1.2,
  operator: TONE_MAPPING_OPERATOR.reinhard,
});
```

:::caution
Registration order matters, the same way it does for bloom and blur:
register `createToneMapEcsSystem` after every HDR-producing pass (render,
bloom, blur) and before `createPresentEcsSystem`. Anything left un-tone-
mapped when it's presented is displayed as-is, hard-clipping at `[0, 1]`
instead of rolling off smoothly.
:::

If a camera has both bloom and tone mapping, register bloom first: it reads
and writes the same HDR `renderTarget`, and tone mapping needs to see
bloom's contribution (including any values it pushed above `1`) to roll it
off correctly, matching the frame order in
[Bloom's wiring section](./bloom.md#wiring-it-up).

## Performance note

Tone mapping costs one full-screen draw per distinct render target,
regardless of `exposure` or `operator`. It runs as a
[post-processing pass](./multipass-rendering.md#writing-a-post-processing-effect),
so the first time a render target is tone-mapped, that target allocates its
second color buffer, at its own format and resolution.
