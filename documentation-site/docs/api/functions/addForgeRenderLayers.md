# Function: addForgeRenderLayers()

> **addForgeRenderLayers**(`layerNames`, `gameContainer`, `layerService`, `world`, `cameraEntity`): `LayerDetail`[]

Defined in: [rendering/utilities/add-forge-render-layers.ts:26](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/rendering/utilities/add-forge-render-layers.ts#L26)

Adds multiple Forge render layers to the game container and registers them with the layer service.
It also creates a render system and a batching system per layer.

## Parameters

### layerNames

`string`[]

The name of the layers.

### gameContainer

`HTMLElement`

The HTML element that will contain the canvas.

### layerService

[`LayerService`](../classes/LayerService.md)

The layer service to register the layers with.

### world

[`World`](../classes/World.md)

The ECS world to which the systems will be added.

### cameraEntity

[`Entity`](../classes/Entity.md)

The entity representing the camera.

## Returns

`LayerDetail`[]

An array containing the created layer and canvas details.
