# Class: InputsComponent

Defined in: [input/components/inputs-component.ts:9](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L9)

The `InputsComponent` tracks various input states such as key presses, mouse button
presses, and mouse coordinates.

## Implements

- [`Component`](../interfaces/Component.md)

## Constructors

### Constructor

> **new InputsComponent**(): `InputsComponent`

Defined in: [input/components/inputs-component.ts:59](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L59)

#### Returns

`InputsComponent`

## Properties

### keyDowns

> **keyDowns**: `Set`\<`string`\>

Defined in: [input/components/inputs-component.ts:25](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L25)

A set of keys that are currently down.

***

### keyPresses

> **keyPresses**: `Set`\<`string`\>

Defined in: [input/components/inputs-component.ts:20](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L20)

A set of currently pressed keys.

***

### keyUps

> **keyUps**: `Set`\<`string`\>

Defined in: [input/components/inputs-component.ts:30](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L30)

A set of keys that have been released.

***

### localMouseCoordinates

> **localMouseCoordinates**: [`Vector2`](Vector2.md)

Defined in: [input/components/inputs-component.ts:50](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L50)

The current coordinates of the mouse cursor in screen space, where [x: 0, y: 0] is the top-left of the screen.

***

### mouseButtonDowns

> **mouseButtonDowns**: `Set`\<`number`\>

Defined in: [input/components/inputs-component.ts:40](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L40)

A set of mouse buttons that are currently down.

***

### mouseButtonPresses

> **mouseButtonPresses**: `Set`\<`number`\>

Defined in: [input/components/inputs-component.ts:35](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L35)

A set of currently pressed mouse buttons.

***

### mouseButtonUps

> **mouseButtonUps**: `Set`\<`number`\>

Defined in: [input/components/inputs-component.ts:45](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L45)

A set of mouse buttons that have been released.

***

### name

> **name**: `symbol`

Defined in: [input/components/inputs-component.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L10)

The unique name of the component.

#### Implementation of

[`Component`](../interfaces/Component.md).[`name`](../interfaces/Component.md#name)

***

### scrollDelta

> **scrollDelta**: `number` = `0`

Defined in: [input/components/inputs-component.ts:15](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L15)

The scroll delta value for the mouse wheel.

***

### worldMouseCoordinates

> **worldMouseCoordinates**: [`Vector2`](Vector2.md)

Defined in: [input/components/inputs-component.ts:55](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L55)

The current coordinates of the mouse cursor in world space, where [x: 0, y: 0] is the center of the world.

***

### symbol

> `readonly` `static` **symbol**: *typeof* [`symbol`](#symbol)

Defined in: [input/components/inputs-component.ts:57](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L57)

## Methods

### isMouseButtonDown()

> **isMouseButtonDown**(`button`): `boolean`

Defined in: [input/components/inputs-component.ts:95](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L95)

Checks if a mouse button is currently down.

#### Parameters

##### button

`number`

The mouse button to check.

#### Returns

`boolean`

True if the mouse button is down, false otherwise.

***

### isMouseButtonPressed()

> **isMouseButtonPressed**(`button`): `boolean`

Defined in: [input/components/inputs-component.ts:113](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L113)

Checks if a mouse button is currently pressed.

#### Parameters

##### button

`number`

The mouse button to check.

#### Returns

`boolean`

True if the mouse button is pressed, false otherwise.

***

### isMouseButtonUp()

> **isMouseButtonUp**(`button`): `boolean`

Defined in: [input/components/inputs-component.ts:104](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L104)

Checks if a mouse button has been released.

#### Parameters

##### button

`number`

The mouse button to check.

#### Returns

`boolean`

True if the mouse button is released, false otherwise.

***

### keyPressed()

> **keyPressed**(`code`): `boolean`

Defined in: [input/components/inputs-component.ts:68](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L68)

Checks if a key is currently pressed.

#### Parameters

##### code

`string`

The key code to check.

#### Returns

`boolean`

True if the key is pressed, false otherwise.

***

### keyPressedDown()

> **keyPressedDown**(`code`): `boolean`

Defined in: [input/components/inputs-component.ts:77](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L77)

Checks if a key is currently down.

#### Parameters

##### code

`string`

The key code to check.

#### Returns

`boolean`

True if the key is down, false otherwise.

***

### keyPressedUp()

> **keyPressedUp**(`code`): `boolean`

Defined in: [input/components/inputs-component.ts:86](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/input/components/inputs-component.ts#L86)

Checks if a key has been released.

#### Parameters

##### code

`string`

The key code to check.

#### Returns

`boolean`

True if the key is released, false otherwise.
