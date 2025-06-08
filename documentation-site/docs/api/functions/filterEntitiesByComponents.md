# Function: filterEntitiesByComponents()

> **filterEntitiesByComponents**(`entities`, `componentSymbols`): `Set`\<[`Entity`](../classes/Entity.md)\>

Defined in: [ecs/entity.ts:168](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/ecs/entity.ts#L168)

Filters entities by the specified components.

## Parameters

### entities

`Set`\<[`Entity`](../classes/Entity.md)\>

The set of entities to filter.

### componentSymbols

`symbol`[]

The symbols of the components to filter by.

## Returns

`Set`\<[`Entity`](../classes/Entity.md)\>

An array of entities that contain all specified components.
