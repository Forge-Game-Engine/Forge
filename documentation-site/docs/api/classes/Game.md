# Class: Game

Defined in: [game/game.ts:9](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/game.ts#L9)

A game that manages scenes and handles the game loop.

## Implements

- [`Stoppable`](../interfaces/Stoppable.md)

## Constructors

### Constructor

> **new Game**(`container?`): `Game`

Defined in: [game/game.ts:35](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/game.ts#L35)

Creates a new Game instance.

#### Parameters

##### container?

The HTML element that will contain the game.

`string` | `HTMLElement`

#### Returns

`Game`

## Properties

### container

> `readonly` **container**: `HTMLElement`

Defined in: [game/game.ts:19](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/game.ts#L19)

The container element for the game.
This is where the game will render its scenes.

***

### onWindowResize

> **onWindowResize**: [`ForgeEvent`](ForgeEvent.md)

Defined in: [game/game.ts:13](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/game.ts#L13)

Event triggered when the window is resized.

## Accessors

### time

#### Get Signature

> **get** **time**(): [`Time`](Time.md)

Defined in: [game/game.ts:62](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/game.ts#L62)

Gets the current time instance.

##### Returns

[`Time`](Time.md)

## Methods

### deregisterScene()

> **deregisterScene**(`scene`): `void`

Defined in: [game/game.ts:92](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/game.ts#L92)

Deregisters a scene from the game.

#### Parameters

##### scene

[`Scene`](Scene.md)

The scene to deregister.

#### Returns

`void`

***

### registerScene()

> **registerScene**(`scene`): `void`

Defined in: [game/game.ts:84](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/game.ts#L84)

Registers a scene to the game.

#### Parameters

##### scene

[`Scene`](Scene.md)

The scene to register.

#### Returns

`void`

***

### run()

> **run**(`time`): `void`

Defined in: [game/game.ts:70](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/game.ts#L70)

Starts the game loop.

#### Parameters

##### time

`number` = `0`

The initial time value.

#### Returns

`void`

***

### stop()

> **stop**(): `void`

Defined in: [game/game.ts:113](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/game.ts#L113)

Stops the game and all registered scenes.

#### Returns

`void`

#### Implementation of

[`Stoppable`](../interfaces/Stoppable.md).[`stop`](../interfaces/Stoppable.md#stop)

***

### swapToScene()

> **swapToScene**(`scene`): `void`

Defined in: [game/game.ts:102](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/game/game.ts#L102)

Swaps the current scene with a new one.
This deregisters all existing scenes and registers the new scene.

#### Parameters

##### scene

[`Scene`](Scene.md)

The new scene to switch to.

#### Returns

`void`
