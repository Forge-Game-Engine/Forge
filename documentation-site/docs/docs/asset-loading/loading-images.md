---
sidebar_position: 1
---

# Loading and Caching Images

[`ImageCache`](/Forge/docs/api/classes/ImageCache) loads image files into
`HTMLImageElement`s and keeps each one keyed by the path it was loaded
from. Every [`RenderContext`](/Forge/docs/api/classes/RenderContext) has
one, as [`imageCache`](/Forge/docs/api/classes/RenderContext#imagecache):

```ts
const { imageCache } = renderContext;
```

## Loading an image

[`getOrLoad(path)`](/Forge/docs/api/classes/ImageCache#getorload) returns
the cached image for `path`, loading it first if it isn't cached. It
rejects if the image fails to load. A sprite draws a
[texture](../rendering/textures.md), so upload the image to one with
`createTexture`:

```ts
import {
  createImageSprite,
  createTexture,
} from '@forge-game-engine/forge/rendering';

const playerImage = await imageCache.getOrLoad('player.png');
const playerTexture = createTexture(renderContext, playerImage);
const playerSprite = createImageSprite(playerTexture);
```

The cache holds images, not textures: each `createTexture` call creates a
new texture. Create one texture per image and share it between the sprites
that draw it, so they [batch](../rendering/sprites.md#batching) into one
draw call. [Sprites](../rendering/sprites.md) covers creating sprites from
a texture.

## Preloading images

`await getOrLoad` waits for the network request the first time a path is
loaded. Load the images a game needs during setup, before the game loop
starts:

```ts
const [ballImage, blockImage] = await Promise.all([
  imageCache.getOrLoad('ball.png'),
  imageCache.getOrLoad('block.png'),
]);
```

After this resolves, `getOrLoad` for these paths returns the cached images
without loading them again, and
[`get(path)`](/Forge/docs/api/classes/ImageCache#get) returns them
synchronously. `get` throws for a path that hasn't finished loading.
[`load(path)`](/Forge/docs/api/classes/ImageCache#load) loads an image into
the cache without returning it.

:::caution
`getOrLoad` doesn't share a load that's still in progress. Two calls for
the same path made before the first one resolves each load the image.
Preloading every path in one step, as above, avoids this.
:::

## Cache keys

The cache's `assets` map is keyed by the exact string passed to `load` or
`getOrLoad`. `'player.png'` and `'./player.png'` are two entries, loaded
separately, even though they refer to the same file. Use one path for each
image.

## Removing an image from the cache

The cache keeps each image until it's deleted from its `assets` map:

```ts
imageCache.assets.delete('player.png');
```

Textures created from the image are separate objects and aren't affected;
[dispose](../rendering/textures.md#disposing-a-texture) them separately.
