# Function: filterEntitiesByComponents()

> **filterEntitiesByComponents**(`entities`, `query`): `Set`\<[`Entity`](../classes/Entity.md)\>

Defined in: [ecs/entity.ts:169](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L169)

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
