# Function: addCamera()

> **addCamera**(`world`, `inputsEntity`, `time`, `cameraOptions`): [`Entity`](../classes/Entity.md)

Defined in: [rendering/utilities/add-camera.ts:14](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/rendering/utilities/add-camera.ts#L14)

Adds a camera entity to the world with the specified options.

## Parameters

### world

[`World`](../classes/World.md)

The world to which the camera will be added.

### inputsEntity

[`Entity`](../classes/Entity.md)

The entity that contains the `InputsComponent`.

### time

[`Time`](../classes/Time.md)

The `Time` instance.

### cameraOptions

`Partial`\<[`CameraComponentOptions`](../type-aliases/CameraComponentOptions.md)\>

Options for configuring the camera.

## Returns

[`Entity`](../classes/Entity.md)

The entity that contains the `CameraComponent`.
