# Function: worldToScreenSpace()

> **worldToScreenSpace**(`worldPosition`, `cameraPosition`, `cameraZoom`, `canvasCenter`): [`Vector2`](../classes/Vector2.md)

Defined in: [rendering/transforms/world-to-screen-space.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/transforms/world-to-screen-space.ts#L12)

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
