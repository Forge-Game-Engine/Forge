# Function: getComponentsFromEntities()

> **getComponentsFromEntities**\<`T`\>(`name`, `entities`): [`OrNull`](../type-aliases/OrNull.md)\<`T`\>[]

Defined in: [ecs/entity.ts:191](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/ecs/entity.ts#L191)

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
