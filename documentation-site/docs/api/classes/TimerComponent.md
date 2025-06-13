# Class: TimerComponent

Defined in: [timer/components/timer-component.ts:13](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/timer/components/timer-component.ts#L13)

Represents a component in the Entity-Component-System (ECS) architecture.
Each component has a unique name represented by a symbol.

## Implements

- [`Component`](../interfaces/Component.md)

## Constructors

### Constructor

> **new TimerComponent**(`tasks`): `TimerComponent`

Defined in: [timer/components/timer-component.ts:19](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/timer/components/timer-component.ts#L19)

#### Parameters

##### tasks

[`TimerTask`](../interfaces/TimerTask.md)[] = `[]`

#### Returns

`TimerComponent`

## Properties

### name

> **name**: `symbol`

Defined in: [timer/components/timer-component.ts:14](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/timer/components/timer-component.ts#L14)

The unique name of the component.

#### Implementation of

[`Component`](../interfaces/Component.md).[`name`](../interfaces/Component.md#name)

***

### tasks

> **tasks**: [`TimerTask`](../interfaces/TimerTask.md)[]

Defined in: [timer/components/timer-component.ts:15](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/timer/components/timer-component.ts#L15)

***

### symbol

> `readonly` `static` **symbol**: *typeof* [`symbol`](#symbol)

Defined in: [timer/components/timer-component.ts:17](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/timer/components/timer-component.ts#L17)

## Methods

### addTask()

> **addTask**(`task`): `void`

Defined in: [timer/components/timer-component.ts:24](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/timer/components/timer-component.ts#L24)

#### Parameters

##### task

[`TimerTask`](../interfaces/TimerTask.md)

#### Returns

`void`
