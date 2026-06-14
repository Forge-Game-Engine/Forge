---
sidebar_position: 5
---

# Asset Loading

Asset loading covers fetching external files (images, sprite sheets,
sounds, data) and turning them into objects your game can use, then caching
the results so the same file is never fetched twice. Forge ships one
concrete cache today, [`ImageCache`](/Forge/docs/api/classes/ImageCache),
plus two supporting building blocks:

- [`AssetCache`](/Forge/docs/api/interfaces/AssetCache): the common
  `get` / `load` / `getOrLoad` contract that asset caches implement.
  `ImageCache` implements it for `HTMLImageElement`; if you add a cache for
  another asset type (audio buffers, JSON data, fonts), implement this
  interface so it behaves consistently with the rest of the engine.
- [`AssetRegistry`](/Forge/docs/api/classes/AssetRegistry): maps
  human-readable string IDs to compact numeric IDs, so hot-path code (like a
  per-frame animation system) can look up an asset by index instead of by
  string.

Guides in this section:

- [Loading and Caching Images](./loading-images.md): using `ImageCache` to
  load images and turn them into sprites.
- [Asset Registries](./asset-registry.md): registering assets under string
  names and looking them up by numeric handle.

## Quick Start

The most common case is loading images through the
[`RenderContext`](/Forge/docs/api/classes/RenderContext)'s built-in
`imageCache`:

```ts
import { createImageSprite } from '@forge-game-engine/forge/rendering';
import { createGame } from '@forge-game-engine/forge/utilities';

const { renderContext } = createGame('game-container');
const { imageCache } = renderContext;

const playerImage = await imageCache.getOrLoad('player.png');
const playerSprite = createImageSprite(playerImage, renderContext, 1);
```

See [Loading and Caching Images](./loading-images.md) for how `getOrLoad`
caching behaves and how to preload assets up front.
