# Class: Game

Defined in: [game/game.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/game/game.ts#L8)

A game that manages scenes and handles the game loop.

## Implements

- [`Stoppable`](../interfaces/Stoppable.md)

## Constructors

### Constructor

> **new Game**(`container`): `Game`

Defined in: [game/game.ts:34](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/game/game.ts#L34)

Creates a new Game instance.

#### Parameters

##### container

`HTMLElement`

The HTML element that will contain the game.

#### Returns

`Game`

## Properties

### container

> `readonly` **container**: `HTMLElement`

Defined in: [game/game.ts:18](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/game/game.ts#L18)

The container element for the game.
This is where the game will render its scenes.

***

### onWindowResize

> **onWindowResize**: [`ForgeEvent`](ForgeEvent.md)

Defined in: [game/game.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/game/game.ts#L12)

Event triggered when the window is resized.

## Accessors

### time

#### Get Signature

> **get** **time**(): [`Time`](Time.md)

Defined in: [game/game.ts:49](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/game/game.ts#L49)

Gets the current time instance.

##### Returns

[`Time`](Time.md)

## Methods

### deregisterScene()

> **deregisterScene**(`scene`): `void`

Defined in: [game/game.ts:79](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/game/game.ts#L79)

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

Defined in: [game/game.ts:71](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/game/game.ts#L71)

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

Defined in: [game/game.ts:57](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/game/game.ts#L57)

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

Defined in: [game/game.ts:87](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/game/game.ts#L87)

Stops the game and all registered scenes.

#### Returns

`void`

#### Implementation of

[`Stoppable`](../interfaces/Stoppable.md).[`stop`](../interfaces/Stoppable.md#stop)
