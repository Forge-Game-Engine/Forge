# Class: LayerService

Defined in: [rendering/layer-service.ts:20](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/rendering/layer-service.ts#L20)

The `LayerService` class manages the creation, registration, and resizing of render layers.

## Implements

- [`Stoppable`](../interfaces/Stoppable.md)

## Constructors

### Constructor

> **new LayerService**(): `LayerService`

Defined in: [rendering/layer-service.ts:27](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/rendering/layer-service.ts#L27)

Constructs a new instance of the `LayerService` class.

#### Returns

`LayerService`

## Methods

### getLayer()

> **getLayer**\<`T`\>(`name`): `T`

Defined in: [rendering/layer-service.ts:52](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/rendering/layer-service.ts#L52)

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

Defined in: [rendering/layer-service.ts:42](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/rendering/layer-service.ts#L42)

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

Defined in: [rendering/layer-service.ts:66](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/rendering/layer-service.ts#L66)

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

Defined in: [rendering/layer-service.ts:78](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/rendering/layer-service.ts#L78)

Cleans up the layer service by removing the resize event listener.

#### Returns

`void`

#### Implementation of

[`Stoppable`](../interfaces/Stoppable.md).[`stop`](../interfaces/Stoppable.md#stop)
