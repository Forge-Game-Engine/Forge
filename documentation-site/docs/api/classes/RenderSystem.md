# Class: RenderSystem

Defined in: [rendering/systems/render-system.ts:16](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/rendering/systems/render-system.ts#L16)

Represents a system in the Entity-Component-System (ECS) architecture.
A system operates on entities that contain specific components.
Systems are responsible for updating the state of entities.

## Extends

- [`System`](System.md)

## Constructors

### Constructor

> **new RenderSystem**(`options`): `RenderSystem`

Defined in: [rendering/systems/render-system.ts:22](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/rendering/systems/render-system.ts#L22)

#### Parameters

##### options

[`RenderSystemOptions`](../interfaces/RenderSystemOptions.md)

#### Returns

`RenderSystem`

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

Defined in: [rendering/systems/render-system.ts:48](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/rendering/systems/render-system.ts#L48)

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

Defined in: [rendering/systems/render-system.ts:54](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/rendering/systems/render-system.ts#L54)

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

Defined in: [rendering/systems/render-system.ts:130](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/rendering/systems/render-system.ts#L130)

Called once at system stop to clear.

#### Returns

`void`

#### Overrides

[`System`](System.md).[`stop`](System.md#stop)
