# Class: RenderableBatchComponent

Defined in: [rendering/components/sprite-batch-component.ts:28](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-batch-component.ts#L28)

The `RenderableBatchComponent` class implements the `Component` interface and represents
a component that contains a items that can be batched for rendering.

## Implements

- [`Component`](../interfaces/Component.md)

## Constructors

### Constructor

> **new RenderableBatchComponent**(`renderLayer`): `RenderableBatchComponent`

Defined in: [rendering/components/sprite-batch-component.ts:44](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-batch-component.ts#L44)

Constructs a new instance of the `RenderableBatchComponent` class.

#### Parameters

##### renderLayer

[`RenderLayer`](RenderLayer.md)

#### Returns

`RenderableBatchComponent`

## Properties

### batches

> **batches**: `Map`\<[`Renderable`](Renderable.md), [`Batch`](../type-aliases/Batch.md)\>

Defined in: [rendering/components/sprite-batch-component.ts:36](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-batch-component.ts#L36)

The map of batched entities.

***

### name

> **name**: `symbol`

Defined in: [rendering/components/sprite-batch-component.ts:30](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-batch-component.ts#L30)

The name property holds the unique symbol for this component.

#### Implementation of

[`Component`](../interfaces/Component.md).[`name`](../interfaces/Component.md#name)

***

### renderLayer

> `readonly` **renderLayer**: [`RenderLayer`](RenderLayer.md)

Defined in: [rendering/components/sprite-batch-component.ts:39](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-batch-component.ts#L39)

The render layer to which the batch belongs.

***

### symbol

> `readonly` `static` **symbol**: *typeof* [`symbol`](#symbol)

Defined in: [rendering/components/sprite-batch-component.ts:33](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-batch-component.ts#L33)

A static symbol property that uniquely identifies the `RenderableBatchComponent`.
