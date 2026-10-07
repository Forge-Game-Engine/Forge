---
sidebar_position: 1
---

# Textures

A [`Texture`](/Forge/docs/api/classes/Texture) is an image on the GPU that a
shader samples: the image a sprite draws, a font atlas, a terrain layer, or
the color of a render target. A texture is loaded from an image file
through the render context's texture cache, or created from an image,
canvas, `ImageData`, `ImageBitmap` or video frame. The code that creates a
texture owns it and disposes it; the texture cache owns the textures it
loads.

## Loading a texture from an image file

[`renderContext.textureCache`](/Forge/docs/api/classes/RenderContext#texturecache)
loads an image file into a texture:

```ts
const texture = await renderContext.textureCache.getOrLoad('ship.png');
```

[`getOrLoad`](/Forge/docs/api/classes/TextureCache#getorload) loads each
file once. Every request for the same URL gets the same texture, including
requests made while it's still loading, so sprites drawn from one file
share a texture and [batch](./sprites.md#batching) into one draw call. The
image itself loads through the render context's
[`imageCache`](../asset-loading/loading-images.md). It rejects if the image
fails to load, and a later request tries again.

Its second argument takes the same [sampling options](#sampling-options)
as `createTexture`. A file loaded with other options is a second texture:

```ts
const pixelArtTexture = await renderContext.textureCache.getOrLoad('hero.png', {
  filter: 'nearest',
});
```

Once a texture has loaded,
[`get(url, options)`](/Forge/docs/api/classes/TextureCache#get) returns it
synchronously, and throws for one that hasn't.

The texture cache owns its textures, since any number of sprites may draw
them: calling `update` or `dispose` on one throws. Create a texture with
`createTexture` to update or dispose it yourself.

## Creating a texture

[`createTexture`](/Forge/docs/api/functions/createTexture) uploads a source
to a new texture in the render context:

```ts
import { createTexture } from '@forge-game-engine/forge/rendering';

const texture = createTexture(renderContext, sourceCanvas);
```

The texture's `width` and `height` are the source's size in texels (an
image's natural size, not its layout size). The source is uploaded as 8-bit
RGBA with straight (not premultiplied) alpha.

To create a texture from raw pixels, wrap them in an `ImageData`:

```ts
const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
const pixelTexture = createTexture(renderContext, new ImageData(pixels, 2, 1));
```

Any number of sprites and materials can use one texture.

## Sampling options

The third argument to `createTexture`, and the second to
`textureCache.getOrLoad`, sets how the texture is sampled:

- `filter` sets how a texel is chosen between texels. `'linear'` (the
  default) blends neighboring texels, for smooth edges. `'nearest'` picks
  the closest texel, for crisp pixel art.
- `wrap` sets what the texture returns outside `[0, 1]`. `'clamp'` (the
  default) repeats the edge texels, so a frame of a sprite sheet never
  samples its neighbor. `'repeat'` tiles the texture, for a texture repeated
  across a surface such as a [terrain layer](../physics/terrain.md).

```ts
const pixelArtTexture = createTexture(renderContext, pixelArtImage, {
  filter: 'nearest',
});

const tiledTexture = createTexture(renderContext, tileImage, {
  wrap: 'repeat',
});
```

A texture's `filter` and `wrap` are fixed when it's created. To sample one
image two ways, create or load two textures from it.

## Updating a texture

[`update`](/Forge/docs/api/classes/Texture#update) replaces a texture's
contents, and its size, with a new source:

```ts
const canvasTexture = createTexture(renderContext, sourceCanvas);

// After drawing into sourceCanvas:
canvasTexture.update(sourceCanvas);
```

Every sprite and material that uses the texture draws the new contents from
then on. A sprite's `width` and `height` don't change when its texture's
size does.

To show a video, call `update` with the `<video>` element or a `VideoFrame`
each frame the video advances.

## The white and black textures

The render context owns two 1x1 opaque textures:

- [`whiteTexture`](/Forge/docs/api/classes/RenderContext#whitetexture) is
  for a sprite drawn as a solid color. The sprite shader multiplies the
  texture by the sprite's `tintColor`, so a white texture draws the tint
  unchanged (see
  [Drawing a solid-color sprite](./sprites.md#drawing-a-solid-color-sprite)).
- [`blackTexture`](/Forge/docs/api/classes/RenderContext#blacktexture) is
  what a material's sampler uniform samples when the material hasn't set
  it, and the emissive map of a sprite without one.

## Disposing a texture

[`dispose`](/Forge/docs/api/classes/Texture#dispose) frees the GPU texture.
Call it once nothing uses the texture any more:

```ts
texture.dispose();
```

Using a disposed texture throws: drawing a sprite with it, binding a
material that has it as a uniform, or calling `update` on it. Disposing a
texture a second time does nothing.

A texture keeps the source it was last updated from until it's disposed,
so that it can upload it again if the WebGL context is lost (see
[Context loss](./context-loss.md)).

Some textures belong to the engine object that created them, and calling
`update` or `dispose` on them throws:

- `renderContext.whiteTexture` and `renderContext.blackTexture` belong to
  the render context.
- A render target's `colorTexture` belongs to the render target, which
  frees it in its own `dispose` (see
  [Render Targets](./multipass-rendering.md)).
- A texture loaded through `renderContext.textureCache`, including a
  [font atlas](../text/loading-a-font-atlas.md)'s `texture`, belongs to
  the texture cache.
