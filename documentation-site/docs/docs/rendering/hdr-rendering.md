---
sidebar_position: 10
---

# HDR Rendering & Tone Mapping

An HDR render target stores color values above `1`, and tone mapping
compresses those values back into the displayable `[0, 1]` range before
the render target is presented. Together they let a sprite be brighter than
white, so it [blooms](./bloom.md) more than a white sprite.

## Render target formats

A [`RenderTarget`](/Forge/docs/api/classes/RenderTarget) stores its color in
one of two formats, from `RENDER_TARGET_FORMAT`:

- `ldr` (the default): 8 bits per channel. Every color a shader writes is
  clamped to `[0, 1]`.
- `hdr`: half-float (`RGBA16F`) per channel. Values above `1` are kept, for
  example from a tint or an
  [emissive](./sprites.md#adding-an-emissive-map) color with channels above
  `1`.

## Rendering a camera in HDR

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

`hdr` needs the `EXT_color_buffer_float` WebGL2 extension. Without it, the
render target is created as `ldr`, and its `format` property is `'ldr'`.
The scratch buffers of bloom, blur and tone mapping use the render target's
`format`, so an `hdr` render target stays HDR through every pass.

:::note
An `hdr` render target and the post-processing buffers created for it use
twice the memory and bandwidth of `ldr` ones. Keep render targets that
don't need values above `1`, such as a UI camera's, at `ldr`.
:::

## Tone mapping a camera

Attach a
[`ToneMappingEcsComponent`](/Forge/docs/api/interfaces/ToneMappingEcsComponent)
to the camera with
[`addToneMappingComponent`](/Forge/docs/api/functions/addToneMappingComponent),
and register
[`createToneMapEcsSystem`](/Forge/docs/api/functions/createToneMapEcsSystem)
before the present system:

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  addToneMappingComponent,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createToneMapEcsSystem,
} from '@forge-game-engine/forge/rendering';

addToneMappingComponent(world, camera);

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createToneMapEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

Each frame, the tone map system replaces the contents of the camera's
`renderTarget` with its tone-mapped colors. An `hdr` render target that
isn't tone-mapped is presented with every channel clamped to `[0, 1]`.

:::caution
Register `createToneMapEcsSystem` after every system that writes the render
target (the render system, [bloom](./bloom.md) and
[Gaussian blur](./gaussian-blur.md)) and before `createPresentEcsSystem`.
Bloom registered after tone mapping adds its glow to colors that are
already compressed.
:::

## Exposure and operators

`ToneMappingEcsComponent` has two fields:

- `exposure`: multiplies the color before it's compressed. Values above `1`
  brighten the image, and values below `1` darken it.
- `operator`: the curve that compresses the color into `[0, 1]`, from
  [`TONE_MAPPING_OPERATOR`](/Forge/docs/api/variables/TONE_MAPPING_OPERATOR):
  - `aces` (the default): the Narkowicz fit of the ACES filmic curve.
  - `reinhard`: `color / (color + 1)`, which desaturates bright colors more
    than `aces`.

```ts
import { TONE_MAPPING_OPERATOR } from '@forge-game-engine/forge/rendering';

addToneMappingComponent(world, camera, {
  exposure: 1.2,
  operator: TONE_MAPPING_OPERATOR.reinhard,
});
```

`addToneMappingComponent` returns the component, and the tone map system
reads it every frame, so a change to `exposure` or `operator` applies from
the next frame.

## Removing tone mapping

Remove the component with `world.removeComponent(camera, toneMappingId)`.
The camera's render target is presented without tone mapping from the next
frame.
