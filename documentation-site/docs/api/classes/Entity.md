# Class: Entity

Defined in: [ecs/entity.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L10)

Represents an entity in the Entity-Component-System (ECS) architecture.
An entity is a container for components and has a unique identifier.

## Constructors

### Constructor

> **new Entity**(`name`, `world`, `initialComponents`, `enabled`): `Entity`

Defined in: [ecs/entity.ts:42](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L42)

Creates a new Entity instance.

#### Parameters

##### name

`string`

The name of the entity.

##### world

[`World`](World.md)

##### initialComponents

[`Component`](../interfaces/Component.md)[]

The initial components to associate with the entity.

##### enabled

`boolean` = `true`

Indicates whether the entity is enabled. Defaults to true.

#### Returns

`Entity`

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [ecs/entity.ts:29](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L29)

Indicates whether the entity is enabled.

***

### name

> **name**: `string`

Defined in: [ecs/entity.ts:24](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L24)

The name of the entity.

***

### world

> **world**: [`World`](World.md)

Defined in: [ecs/entity.ts:34](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L34)

The world to which this entity belongs.

## Accessors

### id

#### Get Signature

> **get** **id**(): `number`

Defined in: [ecs/entity.ts:58](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L58)

Gets the unique identifier of the entity.

##### Returns

`number`

## Methods

### addComponent()

> **addComponent**(`component`): `void`

Defined in: [ecs/entity.ts:66](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L66)

Adds a component to the entity.

#### Parameters

##### component

[`Component`](../interfaces/Component.md)

The component to add.

#### Returns

`void`

***

### containsAllComponents()

> **containsAllComponents**(`query`): `boolean`

Defined in: [ecs/entity.ts:76](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L76)

Checks if the entity contains all specified components.

#### Parameters

##### query

[`Query`](../type-aliases/Query.md)

The symbols of the components to check.

#### Returns

`boolean`

True if the entity contains all specified components, otherwise false.

***

### getComponent()

> **getComponent**\<`T`\>(`componentName`): [`OrNull`](../type-aliases/OrNull.md)\<`T`\>

Defined in: [ecs/entity.ts:105](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L105)

Gets a component by its name.

#### Type Parameters

##### T

`T` *extends* [`Component`](../interfaces/Component.md)

#### Parameters

##### componentName

`symbol`

The name of the component to get.

#### Returns

[`OrNull`](../type-aliases/OrNull.md)\<`T`\>

The component if found, otherwise null.

***

### getComponentRequired()

> **getComponentRequired**\<`T`\>(`componentName`): `T`

Defined in: [ecs/entity.ts:121](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L121)

Gets a component by its name.

#### Type Parameters

##### T

`T` *extends* [`Component`](../interfaces/Component.md)

#### Parameters

##### componentName

`symbol`

The name of the component to get.

#### Returns

`T`

The component if found.

#### Throws

An error if the component is not found.

***

### removeComponent()

> **removeComponent**(`componentName`): `void`

Defined in: [ecs/entity.ts:137](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/ecs/entity.ts#L137)

Removes a component from the entity.

#### Parameters

##### componentName

`symbol`

The name of the component to remove.

#### Returns

`void`
