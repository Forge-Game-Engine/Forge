# Interface: AssetCache\<T\>

Defined in: [asset-loading/asset-cache.ts:6](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/asset-loading/asset-cache.ts#L6)

Interface for an asset cache that manages loading and retrieving assets.

## Type Parameters

### T

`T`

The type of asset being cached.

## Properties

### assets

> **assets**: `Map`\<`string`, `T`\>

Defined in: [asset-loading/asset-cache.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/asset-loading/asset-cache.ts#L10)

A map of asset paths to their corresponding assets.

***

### get()

> **get**: (`path`) => `T`

Defined in: [asset-loading/asset-cache.ts:17](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/asset-loading/asset-cache.ts#L17)

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

Defined in: [asset-loading/asset-cache.ts:31](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/asset-loading/asset-cache.ts#L31)

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

Defined in: [asset-loading/asset-cache.ts:24](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/asset-loading/asset-cache.ts#L24)

Loads an asset from the specified path and caches it.

#### Parameters

##### path

`string`

The path of the asset to load.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the asset is loaded and cached.
