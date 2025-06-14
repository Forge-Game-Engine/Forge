# Class: RiveCache

Defined in: [asset-loading/asset-caches/rive-cache.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/asset-loading/asset-caches/rive-cache.ts#L7)

Class to manage the caching and loading of rive files.

## Implements

- [`AssetCache`](../interfaces/AssetCache.md)\<`RiveFile`\>

## Constructors

### Constructor

> **new RiveCache**(): `RiveCache`

#### Returns

`RiveCache`

## Properties

### assets

> **assets**: `Map`\<`string`, `RiveFile`\>

Defined in: [asset-loading/asset-caches/rive-cache.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/asset-loading/asset-caches/rive-cache.ts#L8)

A map of asset paths to their corresponding assets.

#### Implementation of

[`AssetCache`](../interfaces/AssetCache.md).[`assets`](../interfaces/AssetCache.md#assets)

## Methods

### get()

> **get**(`path`): `RiveFile`

Defined in: [asset-loading/asset-caches/rive-cache.ts:16](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/asset-loading/asset-caches/rive-cache.ts#L16)

Retrieves an asset from the cache.

#### Parameters

##### path

`string`

The path of the rive file to retrieve.

#### Returns

`RiveFile`

The cached rive file.

#### Throws

Will throw an error if the rive file is not found in the cache.

#### Implementation of

[`AssetCache`](../interfaces/AssetCache.md).[`get`](../interfaces/AssetCache.md#get)

***

### getOrLoad()

> **getOrLoad**(`path`, `assetLoader?`): `Promise`\<`RiveFile`\>

Defined in: [asset-loading/asset-caches/rive-cache.ts:55](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/asset-loading/asset-caches/rive-cache.ts#L55)

Retrieves an asset from the cache if it exists, otherwise loads and caches it.

#### Parameters

##### path

`string`

The path of the rive file to retrieve or load.

##### assetLoader?

`AssetLoadCallback`

#### Returns

`Promise`\<`RiveFile`\>

A promise that resolves to the rive file.

#### Implementation of

[`AssetCache`](../interfaces/AssetCache.md).[`getOrLoad`](../interfaces/AssetCache.md#getorload)

***

### load()

> **load**(`path`, `assetLoader?`): `Promise`\<`void`\>

Defined in: [asset-loading/asset-caches/rive-cache.ts:32](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/asset-loading/asset-caches/rive-cache.ts#L32)

Loads an asset from the specified path and caches it.

#### Parameters

##### path

`string`

The path of the rive file to load.

##### assetLoader?

`AssetLoadCallback`

#### Returns

`Promise`\<`void`\>

A promise that resolves when the rive file is loaded and cached.

#### Throws

Will throw an error if the rive file fails to load.

#### Implementation of

[`AssetCache`](../interfaces/AssetCache.md).[`load`](../interfaces/AssetCache.md#load)
