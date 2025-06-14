# Interface: AssetCache\<T\>

Defined in: [asset-loading/asset-cache.ts:6](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/asset-loading/asset-cache.ts#L6)

Interface for an asset cache that manages loading and retrieving assets.

## Type Parameters

### T

`T`

The type of asset being cached.

## Properties

### assets

> **assets**: `Map`\<`string`, `T`\>

Defined in: [asset-loading/asset-cache.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/asset-loading/asset-cache.ts#L10)

A map of asset paths to their corresponding assets.

***

### get()

> **get**: (`path`) => `T`

Defined in: [asset-loading/asset-cache.ts:17](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/asset-loading/asset-cache.ts#L17)

Retrieves an asset from the cache.

#### Parameters

##### path

`string`

The path of the asset to retrieve.

#### Returns

`T`

The cached asset.

***

### getOrLoad()

> **getOrLoad**: (`path`) => `Promise`\<`T`\>

Defined in: [asset-loading/asset-cache.ts:31](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/asset-loading/asset-cache.ts#L31)

Retrieves an asset from the cache if it exists, otherwise loads and caches it.

#### Parameters

##### path

`string`

The path of the asset to retrieve or load.

#### Returns

`Promise`\<`T`\>

A promise that resolves to the asset.

***

### load()

> **load**: (`path`) => `Promise`\<`void`\>

Defined in: [asset-loading/asset-cache.ts:24](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/asset-loading/asset-cache.ts#L24)

Loads an asset from the specified path and caches it.

#### Parameters

##### path

`string`

The path of the asset to load.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the asset is loaded and cached.
