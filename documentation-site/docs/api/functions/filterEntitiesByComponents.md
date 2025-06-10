# Function: filterEntitiesByComponents()

> **filterEntitiesByComponents**(`entities`, `query`): `Set`\<[`Entity`](../classes/Entity.md)\>

Defined in: [ecs/entity.ts:169](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/ecs/entity.ts#L169)

Filters entities by the specified components.

## Parameters

### entities

`Set`\<[`Entity`](../classes/Entity.md)\>

The set of entities to filter.

### query

[`Query`](../type-aliases/Query.md)

The symbols of the components to filter by.

## Returns

`Set`\<[`Entity`](../classes/Entity.md)\>

An array of entities that contain all specified components.
