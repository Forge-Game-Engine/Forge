# Class: ObjectPool\<T\>

Defined in: [pooling/object-pool.ts:6](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/pooling/object-pool.ts#L6)

## Type Parameters

### T

`T` *extends* `NonNullable`\<`unknown`\> = [`Entity`](Entity.md)

## Constructors

### Constructor

> **new ObjectPool**\<`T`\>(`startingPool`, `createCallback`, `disposeCallback`): `ObjectPool`\<`T`\>

Defined in: [pooling/object-pool.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/pooling/object-pool.ts#L11)

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

Defined in: [pooling/object-pool.ts:29](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/pooling/object-pool.ts#L29)

#### Returns

`T`

***

### getOrCreate()

> **getOrCreate**(): `T`

Defined in: [pooling/object-pool.ts:21](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/pooling/object-pool.ts#L21)

#### Returns

`T`

***

### release()

> **release**(`instance`): `void`

Defined in: [pooling/object-pool.ts:43](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/pooling/object-pool.ts#L43)

#### Parameters

##### instance

`T`

#### Returns

`void`
