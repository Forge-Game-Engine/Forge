# Class: World

Defined in: [ecs/world.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L10)

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

Defined in: [ecs/world.ts:216](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L216)

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

Defined in: [ecs/world.ts:169](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L169)

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

Defined in: [ecs/world.ts:124](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L124)

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

Defined in: [ecs/world.ts:141](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L141)

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

Defined in: [ecs/world.ts:204](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L204)

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

Defined in: [ecs/world.ts:77](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L77)

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

Defined in: [ecs/world.ts:69](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L69)

Registers a callback to be invoked when systems change.

#### Parameters

##### callback

(`systems`) => `void`

The callback to register.

#### Returns

`void`

***

### raiseOnEntitiesChangedEvent()

> **raiseOnEntitiesChangedEvent**(): `void`

Defined in: [ecs/world.ts:113](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L113)

Raises the entities changed event.

#### Returns

`void`

***

### raiseOnSystemsChangedEvent()

> **raiseOnSystemsChangedEvent**(): `void`

Defined in: [ecs/world.ts:104](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L104)

Raises the systems changed event.

#### Returns

`void`

***

### removeEntity()

> **removeEntity**(`entity`): `World`

Defined in: [ecs/world.ts:228](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L228)

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

Defined in: [ecs/world.ts:95](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L95)

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

Defined in: [ecs/world.ts:85](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L85)

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

Defined in: [ecs/world.ts:156](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L156)

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

Defined in: [ecs/world.ts:243](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L243)

Stops all systems in the world.

#### Returns

`void`

#### Implementation of

[`Stoppable`](../interfaces/Stoppable.md).[`stop`](../interfaces/Stoppable.md#stop)

***

### update()

> **update**(): `void`

Defined in: [ecs/world.ts:45](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L45)

Updates the object with the given time.

#### Returns

`void`

#### Implementation of

[`Updatable`](../interfaces/Updatable.md).[`update`](../interfaces/Updatable.md#update)

***

### updateSystemEntities()

> **updateSystemEntities**(`entity`): `void`

Defined in: [ecs/world.ts:182](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/world.ts#L182)

Updates the entities in the systems based on the components of the given entity.

#### Parameters

##### entity

[`Entity`](Entity.md)

The entity to update.

#### Returns

`void`
