# Function: screenToWorldSpace()

> **screenToWorldSpace**(`screenPosition`, `cameraPosition`, `cameraZoom`, `screenWidth`, `screenHeight`): [`Vector2`](../classes/Vector2.md)

Defined in: [rendering/transforms/screen-to-world-space.ts:13](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/transforms/screen-to-world-space.ts#L13)

Converts a position from screen space to world space.

## Parameters

### screenPosition

[`Vector2`](../classes/Vector2.md)

The position in screen space (e.g., mouse position relative to the viewport).

### cameraPosition

[`Vector2`](../classes/Vector2.md)

The position of the camera in world space.

### cameraZoom

`number`

The zoom level of the camera.

### screenWidth

`number`

The width of the screen in pixels.

### screenHeight

`number`

The height of the screen in pixels.

## Returns

[`Vector2`](../classes/Vector2.md)

The position in world space.
