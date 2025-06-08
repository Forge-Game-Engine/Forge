# Class: InputSystem

Defined in: [input/systems/input-system.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L11)

The `InputSystem` class. It tracks key presses,
mouse button presses, mouse coordinates, and scroll delta values.

## Extends

- [`System`](System.md)

## Constructors

### Constructor

> **new InputSystem**(`gameContainer`, `cameraEntity`, `screenWidth`, `screenHeight`): `InputSystem`

Defined in: [input/systems/input-system.ts:33](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L33)

Constructs a new instance of the `InputSystem` class and sets up event listeners
for various input events.

#### Parameters

##### gameContainer

`HTMLElement`

The HTML element that contains the game.

##### cameraEntity

[`Entity`](Entity.md)

##### screenWidth

`number`

##### screenHeight

`number`

#### Returns

`InputSystem`

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

### clearInputs()

> **clearInputs**(): `void`

Defined in: [input/systems/input-system.ts:122](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L122)

Clears the current input states.

#### Returns

`void`

***

### onKeyDownHandler()

> **onKeyDownHandler**(`event`): `void`

Defined in: [input/systems/input-system.ts:152](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L152)

Handles the key down event, updating the key press and key down states.

#### Parameters

##### event

`KeyboardEvent`

The keyboard event.

#### Returns

`void`

***

### onKeyUpHandler()

> **onKeyUpHandler**(`event`): `void`

Defined in: [input/systems/input-system.ts:143](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L143)

Handles the key up event, updating the key press and key up states.

#### Parameters

##### event

`KeyboardEvent`

The keyboard event.

#### Returns

`void`

***

### onMouseDownHandler()

> **onMouseDownHandler**(`event`): `void`

Defined in: [input/systems/input-system.ts:182](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L182)

Handles the mouse down event, updating the mouse button press and mouse button down states.

#### Parameters

##### event

`MouseEvent`

The mouse event.

#### Returns

`void`

***

### onMouseUpHandler()

> **onMouseUpHandler**(`event`): `void`

Defined in: [input/systems/input-system.ts:191](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L191)

Handles the mouse up event, updating the mouse button press and mouse button up states.

#### Parameters

##### event

`MouseEvent`

The mouse event.

#### Returns

`void`

***

### onWheelEventHandler()

> **onWheelEventHandler**(`event`): `void`

Defined in: [input/systems/input-system.ts:134](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L134)

Handles the wheel event, updating the scroll delta value.

#### Parameters

##### event

`WheelEvent`

The wheel event.

#### Returns

`void`

***

### run()

> **run**(`entity`): `void`

Defined in: [input/systems/input-system.ts:77](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L77)

Runs the input system for the given entity, updating its `InputsComponent`
with the current input states.

#### Parameters

##### entity

[`Entity`](Entity.md)

The entity to update.

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

Defined in: [input/systems/input-system.ts:98](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L98)

Stops the input system, removing all event listeners.

#### Returns

`void`

#### Overrides

[`System`](System.md).[`stop`](System.md#stop)

***

### updateCursorPosition()

> **updateCursorPosition**(`event`): `void`

Defined in: [input/systems/input-system.ts:165](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/systems/input-system.ts#L165)

Updates the mouse cursor position.

#### Parameters

##### event

`MouseEvent`

The mouse event.

#### Returns

`void`
