# Class: Time

Defined in: [common/time/Time.ts:4](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L4)

Class to manage and track time-related information.

## Constructors

### Constructor

> **new Time**(): `Time`

Defined in: [common/time/Time.ts:17](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L17)

Creates an instance of Time.

#### Returns

`Time`

## Accessors

### deltaTime

#### Get Signature

> **get** **deltaTime**(): `number`

Defined in: [common/time/Time.ts:56](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L56)

Gets the delta time.

##### Returns

`number`

The delta time.

***

### fps

#### Get Signature

> **get** **fps**(): `number`

Defined in: [common/time/Time.ts:123](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L123)

Gets the current frames per second (FPS).

##### Returns

`number`

The current FPS.

***

### frames

#### Get Signature

> **get** **frames**(): `number`

Defined in: [common/time/Time.ts:32](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L32)

Gets the number of frames.

##### Returns

`number`

The number of frames.

***

### previousTime

#### Get Signature

> **get** **previousTime**(): `number`

Defined in: [common/time/Time.ts:72](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L72)

Gets the previous time.

##### Returns

`number`

The previous time.

***

### rawDeltaTime

#### Get Signature

> **get** **rawDeltaTime**(): `number`

Defined in: [common/time/Time.ts:48](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L48)

Gets the raw delta time.

##### Returns

`number`

The raw delta time.

***

### rawTime

#### Get Signature

> **get** **rawTime**(): `number`

Defined in: [common/time/Time.ts:40](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L40)

Gets the raw time.

##### Returns

`number`

The raw time.

***

### time

#### Get Signature

> **get** **time**(): `number`

Defined in: [common/time/Time.ts:64](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L64)

Gets the time.

##### Returns

`number`

The time.

***

### times

#### Get Signature

> **get** **times**(): `number`[]

Defined in: [common/time/Time.ts:96](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L96)

Gets the times array.

##### Returns

`number`[]

The times array.

***

### timeScale

#### Get Signature

> **get** **timeScale**(): `number`

Defined in: [common/time/Time.ts:80](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L80)

Gets the time scale.

##### Returns

`number`

The time scale.

#### Set Signature

> **set** **timeScale**(`value`): `void`

Defined in: [common/time/Time.ts:88](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L88)

Sets the time scale.

##### Parameters

###### value

`number`

The new time scale.

##### Returns

`void`

## Methods

### update()

> **update**(`time`): `void`

Defined in: [common/time/Time.ts:104](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/time/Time.ts#L104)

Updates the time-related information.

#### Parameters

##### time

`number`

The current time.

#### Returns

`void`
