# Function: filterEntitiesByComponents()

> **filterEntitiesByComponents**(`entities`, `query`): `Set`\<[`Entity`](../classes/Entity.md)\>

Defined in: [ecs/entity.ts:169](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/ecs/entity.ts#L169)

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
