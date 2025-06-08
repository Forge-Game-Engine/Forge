# Class: AudioSystem

Defined in: [audio/systems/audio-system.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/audio/systems/audio-system.ts#L7)

System to manage and play sounds for entities with a SoundComponent.

## Extends

- [`System`](System.md)

## Constructors

### Constructor

> **new AudioSystem**(): `AudioSystem`

Defined in: [audio/systems/audio-system.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/audio/systems/audio-system.ts#L11)

Creates an instance of AudioSystem.

#### Returns

`AudioSystem`

#### Overrides

[`System`](System.md).[`constructor`](System.md#constructor)

## Properties

### isEnabled

> **isEnabled**: `boolean` = `true`

Defined in: [ecs/types/System.ts:23](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/ecs/types/System.ts#L23)

Indicates whether the system is enabled.

#### Inherited from

[`System`](System.md).[`isEnabled`](System.md#isenabled)

***

### name

> **name**: `string`

Defined in: [ecs/types/System.ts:13](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/ecs/types/System.ts#L13)

The name of the system.

#### Inherited from

[`System`](System.md).[`name`](System.md#name)

***

### operatesOnComponents

> **operatesOnComponents**: `symbol`[]

Defined in: [ecs/types/System.ts:18](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/ecs/types/System.ts#L18)

The components that this system operates on.

#### Inherited from

[`System`](System.md).[`operatesOnComponents`](System.md#operatesoncomponents)

## Methods

### beforeAll()

> **beforeAll**(`entities`): [`Entity`](Entity.md)[]

Defined in: [ecs/types/System.ts:69](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/ecs/types/System.ts#L69)

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

Defined in: [audio/systems/audio-system.ts:20](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/audio/systems/audio-system.ts#L20)

Runs the audio system for a given entity.

#### Parameters

##### entity

[`Entity`](Entity.md)

The entity to update and play sounds for.

#### Returns

`void`

A promise.

#### Overrides

[`System`](System.md).[`run`](System.md#run)

***

### runSystem()

> **runSystem**(`entities`): `void`

Defined in: [ecs/types/System.ts:39](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/ecs/types/System.ts#L39)

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

Defined in: [ecs/types/System.ts:76](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/ecs/types/System.ts#L76)

Stops the system. This method can be overridden by subclasses.

#### Returns

`void`

#### Inherited from

[`System`](System.md).[`stop`](System.md#stop)
