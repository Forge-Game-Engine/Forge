# Class: EventDispatcher\<TData\>

Defined in: [events/event-dispatcher.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/events/event-dispatcher.ts#L10)

The `EventDispatcher` class is responsible for managing event listeners
and dispatching events to those listeners. It allows adding, removing,
and dispatching events with associated data.

## Type Parameters

### TData

`TData`

The type of data associated with the events.

## Constructors

### Constructor

> **new EventDispatcher**\<`TData`\>(): `EventDispatcher`\<`TData`\>

Defined in: [events/event-dispatcher.ts:19](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/events/event-dispatcher.ts#L19)

Creates a new instance of the `EventDispatcher` class.

#### Returns

`EventDispatcher`\<`TData`\>

## Methods

### addEventListener()

> **addEventListener**(`type`, `event`): `void`

Defined in: [events/event-dispatcher.ts:29](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/events/event-dispatcher.ts#L29)

Adds an event listener for the specified event type.

#### Parameters

##### type

`string`

The type of the event.

##### event

[`ParameterizedForgeEvent`](ParameterizedForgeEvent.md)\<`TData`\>

The event listener to add.

#### Returns

`void`

***

### dispatchEvent()

> **dispatchEvent**(`type`, `data`): `void`

Defined in: [events/event-dispatcher.ts:59](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/events/event-dispatcher.ts#L59)

Dispatches an event of the specified type to all registered listeners.

#### Parameters

##### type

`string`

The type of the event.

##### data

`TData`

The data associated with the event.

#### Returns

`void`

***

### removeEventListener()

> **removeEventListener**(`type`, `event`): `void`

Defined in: [events/event-dispatcher.ts:46](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/events/event-dispatcher.ts#L46)

Removes an event listener for the specified event type.

#### Parameters

##### type

`string`

The type of the event.

##### event

[`ParameterizedForgeEvent`](ParameterizedForgeEvent.md)\<`TData`\>

The event listener to remove.

#### Returns

`void`
