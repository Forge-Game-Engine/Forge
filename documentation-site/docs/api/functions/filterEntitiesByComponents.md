# Function: filterEntitiesByComponents()

> **filterEntitiesByComponents**(`entities`, `componentSymbols`): `Set`\<[`Entity`](../classes/Entity.md)\>

Defined in: [ecs/entity.ts:168](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L168)

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
