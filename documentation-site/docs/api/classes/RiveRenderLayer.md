# Class: RiveRenderLayer

Defined in: [rendering/render-layers/rive-render-layer.ts:9](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/render-layers/rive-render-layer.ts#L9)

The `RiveRenderLayer` class represents a rendering layer with its own canvas and rive instance.

## Extends

- [`RenderLayer`](RenderLayer.md)

## Implements

- [`Stoppable`](../interfaces/Stoppable.md)

## Constructors

### Constructor

> **new RiveRenderLayer**(`name`, `canvas`, `rive`, `riveEventDispatcher`): `RiveRenderLayer`

Defined in: [rendering/render-layers/rive-render-layer.ts:23](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/render-layers/rive-render-layer.ts#L23)

Constructs a new instance of the `RiveRenderLayer` class.

#### Parameters

##### name

`string`

The name of the render layer.

##### canvas

`HTMLCanvasElement`

The canvas element associated with the render layer.

##### rive

`Rive`

The Rive instance to use for rendering.

##### riveEventDispatcher

[`EventDispatcher`](EventDispatcher.md)\<`RiveEventPayload`\>

The event dispatcher for Rive events.

#### Returns

`RiveRenderLayer`

#### Overrides

[`RenderLayer`](RenderLayer.md).[`constructor`](RenderLayer.md#constructor)

## Properties

### canvas

> **canvas**: `HTMLCanvasElement`

Defined in: [rendering/render-layers/render-layer.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/render-layers/render-layer.ts#L11)

The canvas element associated with the render layer.

#### Inherited from

[`RenderLayer`](RenderLayer.md).[`canvas`](RenderLayer.md#canvas)

***

### center

> **center**: [`Vector2`](Vector2.md)

Defined in: [rendering/render-layers/render-layer.ts:14](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/render-layers/render-layer.ts#L14)

The center of the canvas.

#### Inherited from

[`RenderLayer`](RenderLayer.md).[`center`](RenderLayer.md#center)

***

### name

> **name**: `string`

Defined in: [rendering/render-layers/render-layer.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/render-layers/render-layer.ts#L8)

The name of the render layer.

#### Inherited from

[`RenderLayer`](RenderLayer.md).[`name`](RenderLayer.md#name)

***

### rive

> **rive**: `Rive`

Defined in: [rendering/render-layers/rive-render-layer.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/render-layers/rive-render-layer.ts#L11)

The Rive instance associated with the render layer.

## Methods

### registerRiveEvent()

> **registerRiveEvent**(`riveEventName`, `event`): `void`

Defined in: [rendering/render-layers/rive-render-layer.ts:50](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/render-layers/rive-render-layer.ts#L50)

Registers a Rive event with the specified name and event handler.

#### Parameters

##### riveEventName

`string`

The name of the Rive event.

##### event

[`ParameterizedForgeEvent`](ParameterizedForgeEvent.md)\<`RiveEventPayload`\>

The event handler to register.

#### Returns

`void`

***

### resize()

> **resize**(`width`, `height`): `void`

Defined in: [rendering/render-layers/rive-render-layer.ts:40](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/render-layers/rive-render-layer.ts#L40)

Resizes the canvas to the specified width and height, and updates the Rive instance.

#### Parameters

##### width

`number`

The new width of the canvas.

##### height

`number`

The new height of the canvas.

#### Returns

`void`

#### Overrides

[`RenderLayer`](RenderLayer.md).[`resize`](RenderLayer.md#resize)

***

### stop()

> **stop**(): `void`

Defined in: [rendering/render-layers/rive-render-layer.ts:60](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/render-layers/rive-render-layer.ts#L60)

Stops the render layer by clearing the canvas and cleaning up the Rive instance.

#### Returns

`void`

#### Implementation of

[`Stoppable`](../interfaces/Stoppable.md).[`stop`](../interfaces/Stoppable.md#stop)
