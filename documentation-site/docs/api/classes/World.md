# Class: World

Defined in: [ecs/world.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L10)

Represents the world in the Entity-Component-System (ECS) architecture.
The world manages entities and systems, and updates systems with the entities they operate on.

## Implements

- [`Updatable`](../interfaces/Updatable.md)
- [`Stoppable`](../interfaces/Stoppable.md)

## Constructors

### Constructor

> **new World**(): `World`

#### Returns

`World`

## Methods

### addEntities()

> **addEntities**(`entities`): `World`

Defined in: [ecs/world.ts:262](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L262)

Adds multiple entities to the world.

#### Parameters

##### entities

[`Entity`](Entity.md)[]

The entities to add.

#### Returns

`World`

The world instance.

***

### addEntity()

> **addEntity**(`entity`): `World`

Defined in: [ecs/world.ts:215](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L215)

Adds an entity to the world.

#### Parameters

##### entity

[`Entity`](Entity.md)

The entity to add.

#### Returns

`World`

The world instance.

***

### addSystem()

> **addSystem**(`system`): `World`

Defined in: [ecs/world.ts:173](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L173)

Adds a system to the world.

#### Parameters

##### system

[`System`](System.md)

The system to add.

#### Returns

`World`

The world instance.

***

### addSystems()

> **addSystems**(...`systems`): `World`

Defined in: [ecs/world.ts:187](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L187)

Adds multiple systems to the world.

#### Parameters

##### systems

...[`System`](System.md)[]

The systems to add.

#### Returns

`World`

The world instance.

***

### buildAndAddEntity()

> **buildAndAddEntity**(`name`, `components`): [`Entity`](Entity.md)

Defined in: [ecs/world.ts:250](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L250)

Builds and adds an entity to the world.

#### Parameters

##### name

`string`

The name of the entity.

##### components

[`Component`](../interfaces/Component.md)[]

The components to add to the entity.

#### Returns

[`Entity`](Entity.md)

The created entity.

***

### onEntitiesChanged()

> **onEntitiesChanged**(`callback`): `void`

Defined in: [ecs/world.ts:126](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L126)

Registers a callback to be invoked when entities change.

#### Parameters

##### callback

(`entities`) => `void`

The callback to register.

#### Returns

`void`

***

### onSystemsChanged()

> **onSystemsChanged**(`callback`): `void`

Defined in: [ecs/world.ts:118](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L118)

Registers a callback to be invoked when systems change.

#### Parameters

##### callback

(`systems`) => `void`

The callback to register.

#### Returns

`void`

***

### queryEntities()

> **queryEntities**(`componentSymbols`): `Set`\<[`Entity`](Entity.md)\>

Defined in: [ecs/world.ts:69](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L69)

Gets all entities in the world that match the given query.

#### Parameters

##### componentSymbols

[`Query`](../type-aliases/Query.md)

#### Returns

`Set`\<[`Entity`](Entity.md)\>

An array of all entities.

***

### queryEntity()

> **queryEntity**(`query`): `null` \| [`Entity`](Entity.md)

Defined in: [ecs/world.ts:86](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L86)

Gets the first entity that matches the given query.

#### Parameters

##### query

[`Query`](../type-aliases/Query.md)

The query to match against the entities.

#### Returns

`null` \| [`Entity`](Entity.md)

The first matching entity, or null if no entity matches.

***

### queryEntityRequired()

> **queryEntityRequired**(`query`): [`Entity`](Entity.md)

Defined in: [ecs/world.ts:102](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L102)

Gets the first entity that matches the given query, or throws an error if no entity matches.

#### Parameters

##### query

[`Query`](../type-aliases/Query.md)

The query to match against the entities.

#### Returns

[`Entity`](Entity.md)

The first matching entity.

#### Throws

An error if no entity matches the query.

***

### raiseOnEntitiesChangedEvent()

> **raiseOnEntitiesChangedEvent**(): `void`

Defined in: [ecs/world.ts:162](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L162)

Raises the entities changed event.

#### Returns

`void`

***

### raiseOnSystemsChangedEvent()

> **raiseOnSystemsChangedEvent**(): `void`

Defined in: [ecs/world.ts:153](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L153)

Raises the systems changed event.

#### Returns

`void`

***

### removeEntity()

> **removeEntity**(`entity`): `World`

Defined in: [ecs/world.ts:274](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L274)

Removes an entity from the world.

#### Parameters

##### entity

[`Entity`](Entity.md)

The entity to remove.

#### Returns

`World`

The world instance.

***

### removeOnEntitiesChangedCallback()

> **removeOnEntitiesChangedCallback**(`callback`): `void`

Defined in: [ecs/world.ts:144](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L144)

Removes a callback for entities changed events.

#### Parameters

##### callback

(`entities`) => `void`

The callback to remove.

#### Returns

`void`

***

### removeOnSystemsChangedCallback()

> **removeOnSystemsChangedCallback**(`callback`): `void`

Defined in: [ecs/world.ts:134](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L134)

Removes a callback for systems changed events.

#### Parameters

##### callback

(`systems`) => `void`

The callback to remove.

#### Returns

`void`

***

### removeSystem()

> **removeSystem**(`system`): `World`

Defined in: [ecs/world.ts:202](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L202)

Removes a system from the world.

#### Parameters

##### system

[`System`](System.md)

The system to remove.

#### Returns

`World`

The world instance.

***

### stop()

> **stop**(): `void`

Defined in: [ecs/world.ts:289](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L289)

Stops all systems in the world.

#### Returns

`void`

#### Implementation of

[`Stoppable`](../interfaces/Stoppable.md).[`stop`](../interfaces/Stoppable.md#stop)

***

### update()

> **update**(): `void`

Defined in: [ecs/world.ts:45](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L45)

Updates the object with the given time.

#### Returns

`void`

#### Implementation of

[`Updatable`](../interfaces/Updatable.md).[`update`](../interfaces/Updatable.md#update)

***

### updateSystemEntities()

> **updateSystemEntities**(`entity`): `void`

Defined in: [ecs/world.ts:228](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/ecs/world.ts#L228)

Updates the entities in the systems based on the components of the given entity.

#### Parameters

##### entity

[`Entity`](Entity.md)

The entity to update.

#### Returns

`void`
