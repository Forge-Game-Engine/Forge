# Class: LayerService

Defined in: [rendering/layer-service.ts:21](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/layer-service.ts#L21)

The `LayerService` class manages the creation, registration, and resizing of render layers.

## Implements

- [`Stoppable`](../interfaces/Stoppable.md)

## Constructors

### Constructor

> **new LayerService**(`game`): `LayerService`

Defined in: [rendering/layer-service.ts:29](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/layer-service.ts#L29)

Constructs a new instance of the `LayerService` class.

#### Parameters

##### game

[`Game`](Game.md)

#### Returns

`LayerService`

## Methods

### getLayer()

> **getLayer**\<`T`\>(`name`): `T`

Defined in: [rendering/layer-service.ts:55](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/layer-service.ts#L55)

Retrieves a render layer by its name.

#### Type Parameters

##### T

`T` *extends* [`RenderLayer`](RenderLayer.md)

#### Parameters

##### name

`string`

The name of the layer.

#### Returns

`T`

The `RenderLayer` instance.

#### Throws

An error if the layer is not found.

***

### registerLayer()

> **registerLayer**(`layer`): `void`

Defined in: [rendering/layer-service.ts:45](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/layer-service.ts#L45)

Registers an existing canvas element as a render layer.

#### Parameters

##### layer

[`RenderLayer`](RenderLayer.md)

The render layer.

#### Returns

`void`

The registered `RenderLayer` instance.

***

### resizeAllLayers()

> **resizeAllLayers**(`dimensions?`): `void`

Defined in: [rendering/layer-service.ts:69](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/layer-service.ts#L69)

Resizes all registered layers to the specified dimensions.

#### Parameters

##### dimensions?

[`Vector2`](Vector2.md)

The new dimensions for the layers. If not provided, the window dimensions are used.

#### Returns

`void`

***

### stop()

> **stop**(): `void`

Defined in: [rendering/layer-service.ts:81](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/rendering/layer-service.ts#L81)

Cleans up the layer service by removing the resize event listener.

#### Returns

`void`

#### Implementation of

[`Stoppable`](../interfaces/Stoppable.md).[`stop`](../interfaces/Stoppable.md#stop)
