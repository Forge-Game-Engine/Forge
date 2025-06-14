# Class: `abstract` System

Defined in: [ecs/types/System.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/types/System.ts#L10)

Represents a system in the Entity-Component-System (ECS) architecture.
A system operates on entities that contain specific components.
Systems are responsible for updating the state of entities.

## Extended by

- [`AnimationSystem`](AnimationSystem.md)
- [`AudioSystem`](AudioSystem.md)
- [`InputSystem`](InputSystem.md)
- [`PhysicsSystem`](PhysicsSystem.md)
- [`CameraSystem`](CameraSystem.md)
- [`RenderSystem`](RenderSystem.md)
- [`SpriteBatchingSystem`](SpriteBatchingSystem.md)
- [`TimerSystem`](TimerSystem.md)

## Implements

- [`Stoppable`](../interfaces/Stoppable.md)

## Constructors

### Constructor

> **new System**(`name`, `query`): `System`

Defined in: [ecs/types/System.ts:31](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/types/System.ts#L31)

Creates a new System instance.

#### Parameters

##### name

`string`

The name of the system.

##### query

[`Query`](../type-aliases/Query.md)

The components that this system operates on.

#### Returns

`System`

## Properties

### isEnabled

> **isEnabled**: `boolean` = `true`

Defined in: [ecs/types/System.ts:24](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/types/System.ts#L24)

Indicates whether the system is enabled.

***

### name

> **name**: `string`

Defined in: [ecs/types/System.ts:14](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/types/System.ts#L14)

The name of the system.

***

### query

> **query**: [`Query`](../type-aliases/Query.md)

Defined in: [ecs/types/System.ts:19](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/types/System.ts#L19)

The components that this system operates on.

## Methods

### beforeAll()

> **beforeAll**(`entities`): [`Entity`](Entity.md)[]

Defined in: [ecs/types/System.ts:70](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/types/System.ts#L70)

Hook method that is called before running the system on all entities.
Can be overridden by subclasses to modify the entities before processing.

#### Parameters

##### entities

[`Entity`](Entity.md)[]

The entities to be processed.

#### Returns

[`Entity`](Entity.md)[]

The modified entities.

***

### run()

> `abstract` **run**(`entity`): `boolean` \| `void`

Defined in: [ecs/types/System.ts:62](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/types/System.ts#L62)

Abstract method to run the system on a single entity.
Must be implemented by subclasses.

#### Parameters

##### entity

[`Entity`](Entity.md)

The entity to run the system on.

#### Returns

`boolean` \| `void`

void | boolean - Returns void or a boolean indicating whether to exit early.

***

### runSystem()

> **runSystem**(`entities`): `void`

Defined in: [ecs/types/System.ts:40](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/types/System.ts#L40)

Runs the system on the provided entities.

#### Parameters

##### entities

[`Entity`](Entity.md)[]

The entities to run the system on.

#### Returns

`void`

***

### stop()

> **stop**(): `void`

Defined in: [ecs/types/System.ts:77](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/types/System.ts#L77)

Stops the system. This method can be overridden by subclasses.

#### Returns

`void`

#### Implementation of

[`Stoppable`](../interfaces/Stoppable.md).[`stop`](../interfaces/Stoppable.md#stop)
