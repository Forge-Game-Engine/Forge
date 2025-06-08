# Class: CameraSystem

Defined in: [rendering/systems/camera-system.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/rendering/systems/camera-system.ts#L11)

The `CameraSystem` class manages the camera's
zooming and panning based on user inputs.

## Extends

- [`System`](System.md)

## Constructors

### Constructor

> **new CameraSystem**(`inputEntity`, `time`): `CameraSystem`

Defined in: [rendering/systems/camera-system.ts:20](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/rendering/systems/camera-system.ts#L20)

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

Defined in: [ecs/types/System.ts:23](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/ecs/types/System.ts#L23)

Indicates whether the system is enabled.

#### Inherited from

[`System`](System.md).[`isEnabled`](System.md#isenabled)

***

### name

> **name**: `string`

Defined in: [ecs/types/System.ts:13](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/ecs/types/System.ts#L13)

The name of the system.

#### Inherited from

[`System`](System.md).[`name`](System.md#name)

***

### operatesOnComponents

> **operatesOnComponents**: `symbol`[]

Defined in: [ecs/types/System.ts:18](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/ecs/types/System.ts#L18)

The components that this system operates on.

#### Inherited from

[`System`](System.md).[`operatesOnComponents`](System.md#operatesoncomponents)

## Methods

### beforeAll()

> **beforeAll**(`entities`): [`Entity`](Entity.md)[]

Defined in: [ecs/types/System.ts:69](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/ecs/types/System.ts#L69)

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

Defined in: [rendering/systems/camera-system.ts:34](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/rendering/systems/camera-system.ts#L34)

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

Defined in: [ecs/types/System.ts:39](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/ecs/types/System.ts#L39)

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

Defined in: [ecs/types/System.ts:76](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/ecs/types/System.ts#L76)

Stops the system. This method can be overridden by subclasses.

#### Returns

`void`

#### Inherited from

[`System`](System.md).[`stop`](System.md#stop)
