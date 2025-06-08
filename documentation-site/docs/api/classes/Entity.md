# Class: Entity

Defined in: [ecs/entity.ts:9](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L9)

Represents an entity in the Entity-Component-System (ECS) architecture.
An entity is a container for components and has a unique identifier.

## Constructors

### Constructor

> **new Entity**(`name`, `world`, `initialComponents`, `enabled`): `Entity`

Defined in: [ecs/entity.ts:41](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L41)

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

Defined in: [ecs/entity.ts:28](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L28)

Indicates whether the entity is enabled.

***

### name

> **name**: `string`

Defined in: [ecs/entity.ts:23](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L23)

The name of the entity.

***

### world

> **world**: [`World`](World.md)

Defined in: [ecs/entity.ts:33](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L33)

The world to which this entity belongs.

## Accessors

### id

#### Get Signature

> **get** **id**(): `number`

Defined in: [ecs/entity.ts:57](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L57)

Gets the unique identifier of the entity.

##### Returns

`number`

## Methods

### addComponent()

> **addComponent**(`component`): `void`

Defined in: [ecs/entity.ts:65](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L65)

Adds a component to the entity.

#### Parameters

##### component

[`Component`](../interfaces/Component.md)

The component to add.

#### Returns

`void`

***

### containsAllComponents()

> **containsAllComponents**(`componentSymbols`): `boolean`

Defined in: [ecs/entity.ts:75](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L75)

Checks if the entity contains all specified components.

#### Parameters

##### componentSymbols

`symbol`[]

The symbols of the components to check.

#### Returns

`boolean`

True if the entity contains all specified components, otherwise false.

***

### getComponent()

> **getComponent**\<`T`\>(`componentName`): [`OrNull`](../type-aliases/OrNull.md)\<`T`\>

Defined in: [ecs/entity.ts:104](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L104)

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

Defined in: [ecs/entity.ts:120](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L120)

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

Defined in: [ecs/entity.ts:136](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/ecs/entity.ts#L136)

Removes a component from the entity.

#### Parameters

##### componentName

`symbol`

The name of the component to remove.

#### Returns

`void`
