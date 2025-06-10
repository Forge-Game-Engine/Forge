# Function: addRiveRenderLayer()

> **addRiveRenderLayer**(`riveFileUri`, `gameContainer`, `layerService`, `riveCache`, `riveParameters?`): `Promise`\<readonly \[[`RiveRenderLayer`](../classes/RiveRenderLayer.md), `HTMLCanvasElement`, `RiveFile`\]\>

Defined in: [rendering/utilities/add-rive-render-layer.ts:28](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/utilities/add-rive-render-layer.ts#L28)

Adds a Rive render layer to the game container and registers it with the layer service.
It also creates a canvas for the layer.

## Parameters

### riveFileUri

`string`

The URI of the Rive file to load.

### gameContainer

`HTMLElement`

The HTML element that will contain the canvas.

### layerService

[`LayerService`](../classes/LayerService.md)

The layer service to register the layer with.

### riveCache

[`RiveCache`](../classes/RiveCache.md)

The Rive cache to load the Rive file from.

### riveParameters?

`Partial`\<`RiveParameters`\>

Additional parameters for the Rive layer.

## Returns

`Promise`\<readonly \[[`RiveRenderLayer`](../classes/RiveRenderLayer.md), `HTMLCanvasElement`, `RiveFile`\]\>

An array containing the created layer, canvas, and Rive file.
