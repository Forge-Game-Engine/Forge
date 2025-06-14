# Class: ParameterizedForgeEvent\<TInput\>

Defined in: [events/parameterized-forge-event.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/events/parameterized-forge-event.ts#L8)

An parameterized event that can be raised and listened to.

## Type Parameters

### TInput

`TInput` = `null`

The type of the input parameter for the listeners.

## Constructors

### Constructor

> **new ParameterizedForgeEvent**\<`TInput`\>(`name`): `ParameterizedForgeEvent`\<`TInput`\>

Defined in: [events/parameterized-forge-event.ts:30](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/events/parameterized-forge-event.ts#L30)

Creates a new ParameterizedEvent instance.

#### Parameters

##### name

`string`

The name of the event.

#### Returns

`ParameterizedForgeEvent`\<`TInput`\>

## Properties

### name

> **name**: `string`

Defined in: [events/parameterized-forge-event.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/events/parameterized-forge-event.ts#L12)

The name of the event.

## Accessors

### listeners

#### Get Signature

> **get** **listeners**(): `Listener`\<`TInput`\>[]

Defined in: [events/parameterized-forge-event.ts:22](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/events/parameterized-forge-event.ts#L22)

Gets the list of listeners registered to this event.

##### Returns

`Listener`\<`TInput`\>[]

## Methods

### clear()

> **clear**(): `void`

Defined in: [events/parameterized-forge-event.ts:54](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/events/parameterized-forge-event.ts#L54)

Clears all listeners from the event.

#### Returns

`void`

***

### deregisterListener()

> **deregisterListener**(`listener`): `void`

Defined in: [events/parameterized-forge-event.ts:47](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/events/parameterized-forge-event.ts#L47)

Deregisters a listener from the event.

#### Parameters

##### listener

`Listener`\<`TInput`\>

The listener to deregister.

#### Returns

`void`

***

### raise()

> **raise**(`input`): `void`

Defined in: [events/parameterized-forge-event.ts:62](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/events/parameterized-forge-event.ts#L62)

Raises the event, calling all registered listeners with the provided input.

#### Parameters

##### input

`TInput`

The input parameter to pass to the listeners.

#### Returns

`void`

***

### registerListener()

> **registerListener**(`listener`): `void`

Defined in: [events/parameterized-forge-event.ts:39](https://github.com/Forge-Game-Engine/Forge/blob/7b95769650b59c5ba12aa490e41717344ca6bf1e/src/events/parameterized-forge-event.ts#L39)

Registers a listener to the event.

#### Parameters

##### listener

`Listener`\<`TInput`\>

The listener to register.

#### Returns

`void`
