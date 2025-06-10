# Function: worldToScreenSpace()

> **worldToScreenSpace**(`worldPosition`, `cameraPosition`, `cameraZoom`, `canvasCenter`): [`Vector2`](../classes/Vector2.md)

Defined in: [rendering/transforms/world-to-screen-space.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/transforms/world-to-screen-space.ts#L12)

Converts a position from world space to screen space.

## Parameters

### worldPosition

[`Vector2`](../classes/Vector2.md)

The position in world space.

### cameraPosition

[`Vector2`](../classes/Vector2.md)

The position of the camera in world space.

### cameraZoom

`number`

The zoom level of the camera.

### canvasCenter

[`Vector2`](../classes/Vector2.md)

The center of the canvas.

## Returns

[`Vector2`](../classes/Vector2.md)

The position in screen space.
