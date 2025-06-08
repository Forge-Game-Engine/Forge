# Function: addInputs()

> **addInputs**(`world`, `container`, `cameraEntity`, `screenWidth`, `screenHeight`): [`Entity`](../classes/Entity.md)

Defined in: [input/utilities/add-inputs.ts:14](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/input/utilities/add-inputs.ts#L14)

Adds an `InputsComponent` to the world and initializes the input system.

## Parameters

### world

[`World`](../classes/World.md)

The world to which the inputs component will be added.

### container

`HTMLElement`

The HTML element that will receive input events.

### cameraEntity

[`Entity`](../classes/Entity.md)

The entity representing the camera.

### screenWidth

`number`

The width of the screen.

### screenHeight

`number`

The height of the screen.

## Returns

[`Entity`](../classes/Entity.md)

The entity that contains the `InputsComponent`.
