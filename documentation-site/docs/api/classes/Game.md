# Class: Game

Defined in: [game/game.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/game/game.ts#L8)

A game that manages scenes and handles the game loop.

## Implements

- [`Stoppable`](../interfaces/Stoppable.md)

## Constructors

### Constructor

> **new Game**(`container`): `Game`

Defined in: [game/game.ts:33](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/game/game.ts#L33)

Creates a new Game instance.

#### Parameters

##### container

`HTMLElement`

#### Returns

`Game`

## Properties

### container

> `readonly` **container**: `HTMLElement`

Defined in: [game/game.ts:18](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/game/game.ts#L18)

The container element for the game.
This is where the game will render its scenes.

***

### onWindowResize

> **onWindowResize**: [`ForgeEvent`](ForgeEvent.md)

Defined in: [game/game.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/game/game.ts#L12)

Event triggered when the window is resized.

## Accessors

### time

#### Get Signature

> **get** **time**(): [`Time`](Time.md)

Defined in: [game/game.ts:48](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/game/game.ts#L48)

Gets the current time instance.

##### Returns

[`Time`](Time.md)

## Methods

### deregisterScene()

> **deregisterScene**(`scene`): `void`

Defined in: [game/game.ts:78](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/game/game.ts#L78)

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

Defined in: [game/game.ts:70](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/game/game.ts#L70)

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

Defined in: [game/game.ts:56](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/game/game.ts#L56)

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

Defined in: [game/game.ts:86](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/game/game.ts#L86)

Stops the game and all registered scenes.

#### Returns

`void`

#### Implementation of

[`Stoppable`](../interfaces/Stoppable.md).[`stop`](../interfaces/Stoppable.md#stop)
