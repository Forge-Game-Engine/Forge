# Class: ImageCache

Defined in: [asset-loading/asset-caches/image-cache.ts:6](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/asset-loading/asset-caches/image-cache.ts#L6)

Class to manage the caching and loading of images.

## Implements

- [`AssetCache`](../interfaces/AssetCache.md)\<`HTMLImageElement`\>

## Constructors

### Constructor

> **new ImageCache**(): `ImageCache`

#### Returns

`ImageCache`

## Properties

### assets

> **assets**: `Map`\<`string`, `HTMLImageElement`\>

Defined in: [asset-loading/asset-caches/image-cache.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/asset-loading/asset-caches/image-cache.ts#L7)

A map of asset paths to their corresponding assets.

#### Implementation of

[`AssetCache`](../interfaces/AssetCache.md).[`assets`](../interfaces/AssetCache.md#assets)

## Methods

### get()

> **get**(`path`): `HTMLImageElement`

Defined in: [asset-loading/asset-caches/image-cache.ts:15](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/asset-loading/asset-caches/image-cache.ts#L15)

Retrieves an asset from the cache.

#### Parameters

##### path

`string`

The path of the image to retrieve.

#### Returns

`HTMLImageElement`

The cached image element.

#### Throws

Will throw an error if the image is not found in the cache.

#### Implementation of

[`AssetCache`](../interfaces/AssetCache.md).[`get`](../interfaces/AssetCache.md#get)

***

### getOrLoad()

> **getOrLoad**(`path`): `Promise`\<`HTMLImageElement`\>

Defined in: [asset-loading/asset-caches/image-cache.ts:57](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/asset-loading/asset-caches/image-cache.ts#L57)

Retrieves an asset from the cache if it exists, otherwise loads and caches it.

#### Parameters

##### path

`string`

The path of the image to retrieve or load.

#### Returns

`Promise`\<`HTMLImageElement`\>

A promise that resolves to the image element.

#### Implementation of

[`AssetCache`](../interfaces/AssetCache.md).[`getOrLoad`](../interfaces/AssetCache.md#getorload)

***

### load()

> **load**(`path`): `Promise`\<`void`\>

Defined in: [asset-loading/asset-caches/image-cache.ts:31](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/asset-loading/asset-caches/image-cache.ts#L31)

Loads an asset from the specified path and caches it.

#### Parameters

##### path

`string`

The path of the image to load.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the image is loaded and cached.

#### Throws

Will throw an error if the image fails to load.

#### Implementation of

[`AssetCache`](../interfaces/AssetCache.md).[`load`](../interfaces/AssetCache.md#load)
