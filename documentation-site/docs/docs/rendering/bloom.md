---
sidebar_position: 9
---

# Bloom

Bloom is a post-processing effect that adds a glow around the brightest
pixels of a camera's render target. A
[`BloomEcsComponent`](/Forge/docs/api/interfaces/BloomEcsComponent) on a
camera configures the glow, and
[`createBloomEcsSystem`](/Forge/docs/api/functions/createBloomEcsSystem)
draws it for every camera that has both a `renderTarget` and a
`BloomEcsComponent`. A camera missing either is drawn without bloom.

## How bloom is drawn

Each frame, for each render target of a camera with bloom, the bloom system:

1. **Thresholds** the scene: it keeps the pixels whose brightness is above
   `threshold`, fading them in over a small range above it, in a
   downsampled scratch buffer. Each texel of that buffer averages a 4 by 4
   block of CSS pixels.
2. **Blurs** the scratch buffer `passes` times, with the same horizontal and
   vertical blur as [Gaussian Blur](./gaussian-blur.md).
3. **Composites** the blurred buffer onto the full-resolution scene: it adds
   the blurred color, multiplied by `intensity`, to the scene's color.

The downsampling is measured in CSS pixels, so the glow spreads the same
distance on screen at any
[`RenderContext.pixelRatio`](/Forge/docs/api/classes/RenderContext#pixelratio)
(see [High-DPI displays](./world-units-and-cameras.md#high-dpi-displays)).

The composite leaves the scene's alpha unchanged. A render target holds
premultiplied alpha, so the glow shows over pixels that are fully
transparent and, when the render target is presented over another one (see
[Layering multiple render targets](./multipass-rendering.md#layering-multiple-render-targets)),
brightens what is beneath it without covering it.

## Adding bloom to a camera

Give the camera a `renderTarget`, attach a `BloomEcsComponent` with
[`addBloomComponent`](/Forge/docs/api/functions/addBloomComponent), and
register `createBloomEcsSystem` after the render system and before the
present system:

```ts
import { createTransformEcsSystem } from '@forge-game-engine/forge/common';
import {
  addBloomComponent,
  createBloomEcsSystem,
  createCamera,
  createPresentEcsSystem,
  createRenderEcsSystem,
  createRenderTarget,
} from '@forge-game-engine/forge/rendering';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, renderContext } = createGame('game-container');

const sceneTarget = createRenderTarget(renderContext, 'canvas');
const camera = createCamera(world, { renderTarget: sceneTarget });

const bloom = addBloomComponent(world, camera, { threshold: 0.7 });

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));
world.addSystem(createBloomEcsSystem(renderContext));
world.addSystem(createPresentEcsSystem(renderContext));
```

The bloom system reads the camera's `renderTarget` and writes the result
back into it, and the present system draws the render target to the canvas.

:::caution
Register the bloom system after the render system and before the present
system. Registered before the render system, it blooms the previous frame's
contents. Registered after the present system, its result is never drawn to
the canvas.
:::

If a camera also has a [`GaussianBlurEcsComponent`](./gaussian-blur.md),
register `createBloomEcsSystem` before `createGaussianBlurEcsSystem`, so the
glow is blurred along with the rest of the scene.

## Tuning the glow

`BloomEcsComponent` has three fields:

- `threshold` (`0` to `1`): the relative luminance above which a pixel
  contributes to the glow. A lower value makes more of the scene glow.
- `passes`: how many times the bright pixels are blurred. More passes give
  a wider, softer glow.
- `intensity`: the multiplier applied to the glow when it's added to the
  scene. It isn't limited to `1`: `2` adds the glow at twice its brightness.

`addBloomComponent` returns the component, and the bloom system reads it
every frame, so a change to a field applies from the next frame:

```ts
bloom.intensity = 2;
```

An `intensity` or `passes` of `0` draws no bloom.

:::note
A render target uses 8-bit color by default, which clamps every color to
`[0, 1]`. On such a target, a sprite tinted brighter than white blooms no
more than a white one. A render target created with
`RENDER_TARGET_FORMAT.hdr` keeps values above `1`, so brighter sprites
bloom more. See [HDR Rendering & Tone Mapping](./hdr-rendering.md).
:::

## Blooming part of a scene

Bloom applies to a whole render target: everything drawn into a bloomed
render target is bloomed, whichever camera drew it. To bloom some cameras
and not others (for example the game world but not a UI overlay), give them
separate render targets and attach a `BloomEcsComponent` only to the camera
that should glow. See
[Layering multiple render targets](./multipass-rendering.md#layering-multiple-render-targets).

## Emissive-driven bloom

A sprite's [emissive map](./sprites.md#adding-an-emissive-map) adds light to
the pixels the map covers, independent of the sprite's tint. On a camera
whose render target uses `RENDER_TARGET_FORMAT.hdr`, an emissive `color`
with channels above `1` makes those pixels brighter than white, so they
bloom more than the rest of the sprite:

```ts
import {
  addSpriteComponent,
  Color,
  createImageSprite,
  createTexture,
} from '@forge-game-engine/forge/rendering';

addSpriteComponent(world, entity, {
  ...createImageSprite(createTexture(renderContext, image)),
  emissive: {
    texture: createTexture(renderContext, emissiveImage),
    color: new Color(3, 3, 3, 1),
  },
});
```

Pair the `hdr` render target with tone mapping (see
[HDR Rendering & Tone Mapping](./hdr-rendering.md)) so the values above `1`
are compressed into the displayable range when the camera is presented.

### Authoring an emissive map

The emissive map's alpha channel isn't used. The sprite's opacity comes
from its base texture's alpha (times its tint's alpha), so an emissive map
can't make a transparent pixel of the base texture visible.

A glow painted into the art as a low-alpha gradient is blended into the
scene at that low alpha, which leaves it too dim to pass the bloom
`threshold`. Bloom's blur produces the soft falloff instead:

- Author the base texture and the emissive map as opaque shapes with solid
  edges, without a gradient fading to transparent.
- Use moderate emissive `color` channels, around `1` to `3`. Much higher
  values tone-map to nearly white, losing the emissive color's hue.
- Use `passes` to set how far the glow spreads.

## Removing bloom

Remove the component with `world.removeComponent(camera, bloomId)`. The
camera is drawn without bloom from the next frame.
