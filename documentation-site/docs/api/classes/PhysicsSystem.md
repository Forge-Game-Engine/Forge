# Class: PhysicsSystem

Defined in: [physics/systems/physics.system.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/physics/systems/physics.system.ts#L7)

Represents a system in the Entity-Component-System (ECS) architecture.
A system operates on entities that contain specific components.
Systems are responsible for updating the state of entities.

## Extends

- [`System`](System.md)

## Constructors

### Constructor

> **new PhysicsSystem**(`time`, `engine`): `PhysicsSystem`

Defined in: [physics/systems/physics.system.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/physics/systems/physics.system.ts#L11)

#### Parameters

##### time

[`Time`](Time.md)

##### engine

`Engine`

#### Returns

`PhysicsSystem`

#### Overrides

[`System`](System.md).[`constructor`](System.md#constructor)

## Properties

### isEnabled

> **isEnabled**: `boolean` = `true`

Defined in: [ecs/types/System.ts:24](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/types/System.ts#L24)

Indicates whether the system is enabled.

#### Inherited from

[`System`](System.md).[`isEnabled`](System.md#isenabled)

***

### name

> **name**: `string`

Defined in: [ecs/types/System.ts:14](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/types/System.ts#L14)

The name of the system.

#### Inherited from

[`System`](System.md).[`name`](System.md#name)

***

### query

> **query**: [`Query`](../type-aliases/Query.md)

Defined in: [ecs/types/System.ts:19](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/types/System.ts#L19)

The components that this system operates on.

#### Inherited from

[`System`](System.md).[`query`](System.md#query)

## Methods

### beforeAll()

> **beforeAll**(`entities`): [`Entity`](Entity.md)[]

Defined in: [physics/systems/physics.system.ts:22](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/physics/systems/physics.system.ts#L22)

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

Defined in: [physics/systems/physics.system.ts:28](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/physics/systems/physics.system.ts#L28)

Abstract method to run the system on a single entity.
Must be implemented by subclasses.

#### Parameters

##### entity

[`Entity`](Entity.md)

The entity to run the system on.

#### Returns

`void`

void | boolean - Returns void or a boolean indicating whether to exit early.

#### Overrides

[`System`](System.md).[`run`](System.md#run)

***

### runSystem()

> **runSystem**(`entities`): `void`

Defined in: [ecs/types/System.ts:40](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/types/System.ts#L40)

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

Defined in: [ecs/types/System.ts:77](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/types/System.ts#L77)

Stops the system. This method can be overridden by subclasses.

#### Returns

`void`

#### Inherited from

[`System`](System.md).[`stop`](System.md#stop)
