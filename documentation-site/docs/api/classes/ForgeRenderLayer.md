# Class: ForgeRenderLayer

Defined in: [rendering/render-layers/forge-render-layer.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/forge-render-layer.ts#L7)

The `ForgeRenderLayer` class represents a rendering layer with its own canvas and WebGL context.

## Extends

- [`RenderLayer`](RenderLayer.md)

## Constructors

### Constructor

> **new ForgeRenderLayer**(`name`, `canvas`, `clearStrategy`, `sortEntities`): `ForgeRenderLayer`

Defined in: [rendering/render-layers/forge-render-layer.ts:25](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/forge-render-layer.ts#L25)

Constructs a new instance of the `ForgeRenderLayer` class.

#### Parameters

##### name

`string`

The name of the render layer.

##### canvas

`HTMLCanvasElement`

The canvas element associated with the render layer.

##### clearStrategy

[`CLEAR_STRATEGY_KEYS`](../type-aliases/CLEAR_STRATEGY_KEYS.md) = `CLEAR_STRATEGY.blank`

The strategy for clearing the render layer (default: CLEAR_STRATEGY.blank).

##### sortEntities

`boolean` = `false`

Whether to sort entities by their y position before rendering (default: false).

#### Returns

`ForgeRenderLayer`

#### Throws

An error if the WebGL2 context is not found.

#### Overrides

[`RenderLayer`](RenderLayer.md).[`constructor`](RenderLayer.md#constructor)

## Properties

### canvas

> **canvas**: `HTMLCanvasElement`

Defined in: [rendering/render-layers/render-layer.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/render-layer.ts#L11)

The canvas element associated with the render layer.

#### Inherited from

[`RenderLayer`](RenderLayer.md).[`canvas`](RenderLayer.md#canvas)

***

### center

> **center**: [`Vector2`](Vector2.md)

Defined in: [rendering/render-layers/render-layer.ts:14](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/render-layer.ts#L14)

The center of the canvas.

#### Inherited from

[`RenderLayer`](RenderLayer.md).[`center`](RenderLayer.md#center)

***

### clearStrategy

> **clearStrategy**: [`CLEAR_STRATEGY_KEYS`](../type-aliases/CLEAR_STRATEGY_KEYS.md)

Defined in: [rendering/render-layers/forge-render-layer.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/forge-render-layer.ts#L12)

The strategy for clearing the render layer.

***

### context

> **context**: `WebGL2RenderingContext`

Defined in: [rendering/render-layers/forge-render-layer.ts:9](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/forge-render-layer.ts#L9)

The WebGL2 rendering context for the canvas.

***

### name

> **name**: `string`

Defined in: [rendering/render-layers/render-layer.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/render-layer.ts#L8)

The name of the render layer.

#### Inherited from

[`RenderLayer`](RenderLayer.md).[`name`](RenderLayer.md#name)

***

### sortEntities

> **sortEntities**: `boolean`

Defined in: [rendering/render-layers/forge-render-layer.ts:15](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/forge-render-layer.ts#L15)

Whether to sort entities by their y position before rendering.

## Methods

### resize()

> **resize**(`width`, `height`): `void`

Defined in: [rendering/render-layers/forge-render-layer.ts:46](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/rendering/render-layers/forge-render-layer.ts#L46)

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

#### Overrides

[`RenderLayer`](RenderLayer.md).[`resize`](RenderLayer.md#resize)
