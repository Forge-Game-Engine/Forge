# Class: ObjectPool\<T\>

Defined in: [pooling/object-pool.ts:6](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/pooling/object-pool.ts#L6)

## Type Parameters

### T

`T` *extends* `NonNullable`\<`unknown`\> = [`Entity`](Entity.md)

## Constructors

### Constructor

> **new ObjectPool**\<`T`\>(`startingPool`, `createCallback`, `disposeCallback`): `ObjectPool`\<`T`\>

Defined in: [pooling/object-pool.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/pooling/object-pool.ts#L11)

#### Parameters

##### startingPool

`T`[]

##### createCallback

`PoolCreateCallback`\<`T`\>

##### disposeCallback

`PoolDisposeCallback`\<`T`\>

#### Returns

`ObjectPool`\<`T`\>

## Methods

### get()

> **get**(): `T`

Defined in: [pooling/object-pool.ts:29](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/pooling/object-pool.ts#L29)

#### Returns

`T`

***

### getOrCreate()

> **getOrCreate**(): `T`

Defined in: [pooling/object-pool.ts:21](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/pooling/object-pool.ts#L21)

#### Returns

`T`

***

### release()

> **release**(`instance`): `void`

Defined in: [pooling/object-pool.ts:43](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/pooling/object-pool.ts#L43)

#### Parameters

##### instance

`T`

#### Returns

`void`
