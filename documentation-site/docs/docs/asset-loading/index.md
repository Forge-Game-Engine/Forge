---
sidebar_position: 5
---

# Asset Loading

Asset loading fetches external files (images, sounds, font atlases) and
turns them into objects a game uses, keeping each loaded asset in a cache
keyed by its URL so later requests return it without loading it again.

The module's parts:

- [`AssetCache`](/Forge/docs/api/interfaces/AssetCache): the `get`,
  `load` and `getOrLoad` methods and `assets` map shared by caches that
  load an asset from one URL. Implement it for a cache of another asset type,
  such as JSON data.
- [`ImageCache`](/Forge/docs/api/classes/ImageCache): an `AssetCache` of
  `HTMLImageElement`s. Every
  [`RenderContext`](/Forge/docs/api/classes/RenderContext) has one, as
  `imageCache`. See [Loading and Caching Images](./loading-images.md).
- [`AssetRegistry`](/Forge/docs/api/classes/AssetRegistry): assigns
  numeric IDs to assets registered under string names, so code that runs
  every frame looks an asset up by array index instead of by string. See
  [Asset Registries](./asset-registry.md).

Other modules have their own caches.
[`SoundAssetCache`](/Forge/docs/api/classes/SoundAssetCache) is an
`AssetCache` of decoded sounds (see
[Loading Sounds](../audio/loading-sounds.md)).
[`FontAtlasCache`](/Forge/docs/api/classes/FontAtlasCache) loads each font
atlas from two URLs, so it has its own `getOrLoad({ metricsUrl, imageUrl })`
instead (see [Loading a Font Atlas](../text/loading-a-font-atlas.md)).
