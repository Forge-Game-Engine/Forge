# Class: ForgeEvent

Defined in: [events/forge-event.ts:6](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/events/forge-event.ts#L6)

An event that can be raised and listened to.

## Constructors

### Constructor

> **new ForgeEvent**(`name`): `ForgeEvent`

Defined in: [events/forge-event.ts:28](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/events/forge-event.ts#L28)

Creates a new event.

#### Parameters

##### name

`string`

The name of the event.

#### Returns

`ForgeEvent`

## Properties

### name

> **name**: `string`

Defined in: [events/forge-event.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/events/forge-event.ts#L10)

The name of the event.

## Accessors

### listeners

#### Get Signature

> **get** **listeners**(): `Listener`[]

Defined in: [events/forge-event.ts:20](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/events/forge-event.ts#L20)

Gets the list of listeners registered to this event.

##### Returns

`Listener`[]

## Methods

### clear()

> **clear**(): `void`

Defined in: [events/forge-event.ts:52](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/events/forge-event.ts#L52)

Clears all listeners from the event.

#### Returns

`void`

***

### deregisterListener()

> **deregisterListener**(`listener`): `void`

Defined in: [events/forge-event.ts:45](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/events/forge-event.ts#L45)

Deregisters a listener from the event.

#### Parameters

##### listener

`Listener`

The listener to deregister.

#### Returns

`void`

***

### raise()

> **raise**(): `void`

Defined in: [events/forge-event.ts:59](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/events/forge-event.ts#L59)

Raises the event, calling all registered listeners.

#### Returns

`void`

***

### registerListener()

> **registerListener**(`listener`): `void`

Defined in: [events/forge-event.ts:37](https://github.com/Forge-Game-Engine/Forge/blob/6eae4e51dbdc502818b1c2f3a3ffce9e4a1fd125/src/events/forge-event.ts#L37)

Registers a listener to the event.

#### Parameters

##### listener

`Listener`

The listener to register.

#### Returns

`void`
