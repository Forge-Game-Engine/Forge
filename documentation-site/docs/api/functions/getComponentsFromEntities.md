# Function: getComponentsFromEntities()

> **getComponentsFromEntities**\<`T`\>(`name`, `entities`): [`OrNull`](../type-aliases/OrNull.md)\<`T`\>[]

Defined in: [ecs/entity.ts:192](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/entity.ts#L192)

Gets components from entities by their name.

## Type Parameters

### T

`T` *extends* [`Component`](../interfaces/Component.md)

## Parameters

### name

`symbol`

The name of the component to get.

### entities

[`Entity`](../classes/Entity.md)[]

The entities to get the components from.

## Returns

[`OrNull`](../type-aliases/OrNull.md)\<`T`\>[]

An array of components.
