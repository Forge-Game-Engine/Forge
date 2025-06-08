# Class: `abstract` RenderLayer

Defined in: [rendering/render-layers/render-layer.ts:6](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/render-layer.ts#L6)

The `RenderLayer` class represents a rendering layer with its own canvas and WebGL context.

## Extended by

- [`ForgeRenderLayer`](ForgeRenderLayer.md)
- [`RiveRenderLayer`](RiveRenderLayer.md)

## Constructors

### Constructor

> **new RenderLayer**(`name`, `canvas`): `RenderLayer`

Defined in: [rendering/render-layers/render-layer.ts:21](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/render-layer.ts#L21)

Constructs a new instance of the `RenderLayer` class.

#### Parameters

##### name

`string`

The name of the render layer.

##### canvas

`HTMLCanvasElement`

The canvas element associated with the render layer.

#### Returns

`RenderLayer`

## Properties

### canvas

> **canvas**: `HTMLCanvasElement`

Defined in: [rendering/render-layers/render-layer.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/render-layer.ts#L11)

The canvas element associated with the render layer.

***

### center

> **center**: [`Vector2`](Vector2.md)

Defined in: [rendering/render-layers/render-layer.ts:14](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/render-layer.ts#L14)

The center of the canvas.

***

### name

> **name**: `string`

Defined in: [rendering/render-layers/render-layer.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/render-layer.ts#L8)

The name of the render layer.

## Methods

### resize()

> **resize**(`width`, `height`): `void`

Defined in: [rendering/render-layers/render-layer.ts:32](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/render-layer.ts#L32)

Resizes the canvas to the specified width and height, and updates the center.

#### Parameters

##### width

`number`

The new width of the canvas.

##### height

`number`

The new height of the canvas.

#### Returns

`void`
