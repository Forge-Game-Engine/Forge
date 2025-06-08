# Function: getComponentsFromEntities()

> **getComponentsFromEntities**\<`T`\>(`name`, `entities`): [`OrNull`](../type-aliases/OrNull.md)\<`T`\>[]

Defined in: [ecs/entity.ts:191](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L191)

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
