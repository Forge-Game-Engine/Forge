# Class: SpriteBatchingSystem

Defined in: [rendering/systems/sprite-batching-system.ts:16](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/systems/sprite-batching-system.ts#L16)

The `SpriteBatchingSystem` class extends the `System` class and manages the batching of sprites.

## Extends

- [`System`](System.md)

## Constructors

### Constructor

> **new SpriteBatchingSystem**(`spriteBatcherEntity`): `SpriteBatchingSystem`

Defined in: [rendering/systems/sprite-batching-system.ts:19](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/systems/sprite-batching-system.ts#L19)

#### Parameters

##### spriteBatcherEntity

[`Entity`](Entity.md)

#### Returns

`SpriteBatchingSystem`

#### Overrides

[`System`](System.md).[`constructor`](System.md#constructor)

## Properties

### isEnabled

> **isEnabled**: `boolean` = `true`

Defined in: [ecs/types/System.ts:24](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/types/System.ts#L24)

Indicates whether the system is enabled.

#### Inherited from

[`System`](System.md).[`isEnabled`](System.md#isenabled)

***

### name

> **name**: `string`

Defined in: [ecs/types/System.ts:14](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/types/System.ts#L14)

The name of the system.

#### Inherited from

[`System`](System.md).[`name`](System.md#name)

***

### query

> **query**: [`Query`](../type-aliases/Query.md)

Defined in: [ecs/types/System.ts:19](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/types/System.ts#L19)

The components that this system operates on.

#### Inherited from

[`System`](System.md).[`query`](System.md#query)

## Methods

### beforeAll()

> **beforeAll**(`entities`): [`Entity`](Entity.md)[]

Defined in: [rendering/systems/sprite-batching-system.ts:31](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/systems/sprite-batching-system.ts#L31)

Hook method that is called before running the system on all entities.
Can be overridden by subclasses to modify the entities before processing.

#### Parameters

##### entities

[`Entity`](Entity.md)[]

The entities to be processed.

#### Returns

[`Entity`](Entity.md)[]

The modified entities.

#### Overrides

[`System`](System.md).[`beforeAll`](System.md#beforeall)

***

### run()

> **run**(`entity`): `void`

Defined in: [rendering/systems/sprite-batching-system.ts:41](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/systems/sprite-batching-system.ts#L41)

Runs the batching system for the given entity, batching the sprite.

#### Parameters

##### entity

[`Entity`](Entity.md)

The entity.

#### Returns

`void`

#### Overrides

[`System`](System.md).[`run`](System.md#run)

***

### runSystem()

> **runSystem**(`entities`): `void`

Defined in: [ecs/types/System.ts:40](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/types/System.ts#L40)

Runs the system on the provided entities.

#### Parameters

##### entities

[`Entity`](Entity.md)[]

The entities to run the system on.

#### Returns

`void`

#### Inherited from

[`System`](System.md).[`runSystem`](System.md#runsystem)

***

### stop()

> **stop**(): `void`

Defined in: [ecs/types/System.ts:77](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/types/System.ts#L77)

Stops the system. This method can be overridden by subclasses.

#### Returns

`void`

#### Inherited from

[`System`](System.md).[`stop`](System.md#stop)
