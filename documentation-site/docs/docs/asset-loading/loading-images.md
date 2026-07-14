---
sidebar_position: 1
---

# Loading and Caching Images

[`ImageCache`](/Forge/docs/api/classes/ImageCache) loads image files into
`HTMLImageElement`s and keeps them keyed by the path they were loaded from,
so the same file is only ever downloaded and decoded once. Every
[`RenderContext`](/Forge/docs/api/classes/RenderContext) creates one
automatically and exposes it as
[`imageCache`](/Forge/docs/api/classes/RenderContext#imagecache):

```ts
const { imageCache } = renderContext;
```

## Loading an image

[`getOrLoad(path)`](/Forge/docs/api/classes/ImageCache#getorload) is the
method you'll use almost everywhere: it returns the cached image if `path`
has already been loaded, otherwise it loads it first. Either way you get
back an `HTMLImageElement` ready to hand to a sprite:

```ts
const playerImage = await imageCache.getOrLoad('player.png');
const playerSprite = createImageSprite(playerImage, renderContext, layer);
```

[`get(path)`](/Forge/docs/api/classes/ImageCache#get) and
[`load(path)`](/Forge/docs/api/classes/ImageCache#load) are the two halves
`getOrLoad` combines, and are mostly useful if you want to load and "get"
at different points in time. `get` throws if `path` hasn't been loaded yet,
so don't call it for an image you haven't awaited `load` or `getOrLoad` for.

## Preload up front, not mid-gameplay

Calling `getOrLoad` the first time an image is needed works, but the
`await` means whatever you're doing (spawning an entity, starting a level)
pauses until the network request finishes. For anything beyond a quick demo,
load every image you'll need during setup, before the game loop starts:

```ts
const [ballImage, squareImage, triangleImage] = await Promise.all([
  imageCache.getOrLoad('ball_blue_large.png'),
  imageCache.getOrLoad('block_square.png'),
  imageCache.getOrLoad('block_corner_large.png'),
]);
```

After this resolves, every later `getOrLoad('ball_blue_large.png')` returns
the cached image instantly with no `await` needed (its promise still
resolves on the same tick, but no network or decode work happens).

:::caution
`getOrLoad` does not deduplicate _in-flight_ loads. If you call
`getOrLoad('player.png')` from two places before the first call has
resolved, both see an empty cache and both create a new `Image()` and start
a separate load. Awaiting a single `Promise.all` preload step (as above)
avoids this, since by the time gameplay code runs, every path is already
cached.
:::

## Cache keys are exact paths

The cache is a `Map<string, HTMLImageElement>` keyed by the exact string
passed to `load` / `getOrLoad`. `'player.png'` and `'./player.png'` are
treated as two different entries (and trigger two separate loads), even if
they resolve to the same file. Pick one path format per asset and use it
consistently.

## Worked example

```ts
import { createImageSprite } from '@forge-game-engine/forge/rendering';
import { createGame } from '@forge-game-engine/forge/utilities';

const { renderContext } = createGame('game-container');
const { imageCache } = renderContext;

const [ballImage, squareImage] = await Promise.all([
  imageCache.getOrLoad('ball_blue_large.png'),
  imageCache.getOrLoad('block_square.png'),
]);

const ballSprite = createImageSprite(ballImage, renderContext, 1);
const squareSprite = createImageSprite(squareImage, renderContext, 1);
```
