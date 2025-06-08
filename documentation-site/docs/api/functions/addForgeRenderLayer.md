# Function: addForgeRenderLayer()

> **addForgeRenderLayer**(`layerName`, `gameContainer`, `layerService`, `world`, `cameraEntity`): readonly \[[`ForgeRenderLayer`](../classes/ForgeRenderLayer.md), `HTMLCanvasElement`\]

Defined in: [rendering/utilities/add-forge-render-layer.ts:18](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/utilities/add-forge-render-layer.ts#L18)

Adds a Forge render layer to the game container and registers it with the layer service.
It also creates a render system and a batching system for the layer.

## Parameters

### layerName

`string`

The name of the layer.

### gameContainer

`HTMLElement`

The HTML element that will contain the canvas.

### layerService

[`LayerService`](../classes/LayerService.md)

The layer service to register the layer with.

### world

[`World`](../classes/World.md)

The ECS world to which the systems will be added.

### cameraEntity

[`Entity`](../classes/Entity.md)

The entity representing the camera.

## Returns

readonly \[[`ForgeRenderLayer`](../classes/ForgeRenderLayer.md), `HTMLCanvasElement`\]

An array containing the created layer and canvas.
