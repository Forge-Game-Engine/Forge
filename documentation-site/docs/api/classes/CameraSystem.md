# Class: CameraSystem

Defined in: [rendering/systems/camera-system.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/systems/camera-system.ts#L11)

The `CameraSystem` class manages the camera's
zooming and panning based on user inputs.

## Extends

- [`System`](System.md)

## Constructors

### Constructor

> **new CameraSystem**(`inputEntity`, `time`): `CameraSystem`

Defined in: [rendering/systems/camera-system.ts:20](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/systems/camera-system.ts#L20)

Constructs a new instance of the `CameraSystem` class.

#### Parameters

##### inputEntity

[`Entity`](Entity.md)

The entity that contains the `InputsComponent`.

##### time

[`Time`](Time.md)

The `Time` instance for managing time-related operations.

#### Returns

`CameraSystem`

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

Defined in: [ecs/types/System.ts:70](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/types/System.ts#L70)

Hook method that is called before running the system on all entities.
Can be overridden by subclasses to modify the entities before processing.

#### Parameters

##### entities

[`Entity`](Entity.md)[]

The entities to be processed.

#### Returns

[`Entity`](Entity.md)[]

The modified entities.

#### Inherited from

[`System`](System.md).[`beforeAll`](System.md#beforeall)

***

### run()

> **run**(`entity`): `void`

Defined in: [rendering/systems/camera-system.ts:34](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/systems/camera-system.ts#L34)

Runs the camera system for the given entity, updating the camera's zoom and position
based on user inputs.

#### Parameters

##### entity

[`Entity`](Entity.md)

The entity that contains the `CameraComponent` and `PositionComponent`.

#### Returns

`void`

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
