# Class: Scene

Defined in: [game/scene.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L7)

A scene in the game, which can contain updatable and stoppable objects.

## Implements

- [`Updatable`](../interfaces/Updatable.md)
- [`Stoppable`](../interfaces/Stoppable.md)

## Constructors

### Constructor

> **new Scene**(`name`): `Scene`

Defined in: [game/scene.ts:27](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L27)

Creates a new Scene instance.

#### Parameters

##### name

`string`

The name of the scene.

#### Returns

`Scene`

## Properties

### name

> **name**: `string`

Defined in: [game/scene.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L11)

The name of the scene.

## Methods

### deregisterStoppable()

> **deregisterStoppable**(`stoppable`): `void`

Defined in: [game/scene.ts:82](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L82)

Deregisters a stoppable object from the scene.

#### Parameters

##### stoppable

[`Stoppable`](../interfaces/Stoppable.md)

The stoppable object to deregister.

#### Returns

`void`

***

### deregisterStoppables()

> **deregisterStoppables**(...`stoppables`): `void`

Defined in: [game/scene.ts:100](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L100)

Deregisters multiple stoppable objects from the scene.

#### Parameters

##### stoppables

...[`Stoppable`](../interfaces/Stoppable.md)[]

An array or iterable of stoppable objects to deregister.

#### Returns

`void`

***

### deregisterUpdatable()

> **deregisterUpdatable**(`updatable`): `void`

Defined in: [game/scene.ts:46](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L46)

Deregisters an updatable object from the scene.

#### Parameters

##### updatable

[`Updatable`](../interfaces/Updatable.md)

The updatable object to deregister.

#### Returns

`void`

***

### deregisterUpdatables()

> **deregisterUpdatables**(...`updatables`): `void`

Defined in: [game/scene.ts:64](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L64)

Deregisters multiple updatable objects from the scene.

#### Parameters

##### updatables

...[`Updatable`](../interfaces/Updatable.md)[]

An array or iterable of updatable objects to deregister.

#### Returns

`void`

***

### registerStoppable()

> **registerStoppable**(`stoppable`): `void`

Defined in: [game/scene.ts:74](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L74)

Registers a stoppable object to the scene.

#### Parameters

##### stoppable

[`Stoppable`](../interfaces/Stoppable.md)

The stoppable object to register.

#### Returns

`void`

***

### registerStoppables()

> **registerStoppables**(...`stoppables`): `void`

Defined in: [game/scene.ts:90](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L90)

Registers multiple stoppable objects to the scene.

#### Parameters

##### stoppables

...[`Stoppable`](../interfaces/Stoppable.md)[]

An array or iterable of stoppable objects to register.

#### Returns

`void`

***

### registerUpdatable()

> **registerUpdatable**(`updatable`): `void`

Defined in: [game/scene.ts:38](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L38)

Registers an updatable object to the scene.

#### Parameters

##### updatable

[`Updatable`](../interfaces/Updatable.md)

The updatable object to register.

#### Returns

`void`

***

### registerUpdatables()

> **registerUpdatables**(...`updatables`): `void`

Defined in: [game/scene.ts:54](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L54)

Registers multiple updatable objects to the scene.

#### Parameters

##### updatables

...[`Updatable`](../interfaces/Updatable.md)[]

An array or iterable of updatable objects to register.

#### Returns

`void`

***

### stop()

> **stop**(): `void`

Defined in: [game/scene.ts:119](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L119)

Stops all registered stoppable objects in the scene.

#### Returns

`void`

#### Implementation of

[`Stoppable`](../interfaces/Stoppable.md).[`stop`](../interfaces/Stoppable.md#stop)

***

### update()

> **update**(`time`): `void`

Defined in: [game/scene.ts:110](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/scene.ts#L110)

Updates the object with the given time.

#### Parameters

##### time

[`Time`](Time.md)

The current time.

#### Returns

`void`

#### Implementation of

[`Updatable`](../interfaces/Updatable.md).[`update`](../interfaces/Updatable.md#update)
