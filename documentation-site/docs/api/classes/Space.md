# Class: Space

Defined in: [common/space/space.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/space/space.ts#L7)

Class to represent a 2D space with width, height, and center point.

## Constructors

### Constructor

> **new Space**(`width`, `height`): `Space`

Defined in: [common/space/space.ts:27](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/space/space.ts#L27)

Creates an instance of Space.

#### Parameters

##### width

`number`

The width of the space.

##### height

`number`

The height of the space.

#### Returns

`Space`

#### Example

```ts
const space = new Space(800, 600);
console.log(space.width); // 800
console.log(space.height); // 600
console.log(space.center); // Vector2 { x: 400, y: 300 }
```

## Properties

### onSpaceChange

> **onSpaceChange**: [`ForgeEvent`](ForgeEvent.md)

Defined in: [common/space/space.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/space/space.ts#L11)

Event that is raised when the space changes.

## Accessors

### center

#### Get Signature

> **get** **center**(): [`Vector2`](Vector2.md)

Defined in: [common/space/space.ts:40](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/space/space.ts#L40)

Gets the center point of the space.

##### Returns

[`Vector2`](Vector2.md)

The center point of the space.

***

### height

#### Get Signature

> **get** **height**(): `number`

Defined in: [common/space/space.ts:56](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/space/space.ts#L56)

Gets the height of the space.

##### Returns

`number`

The height of the space.

***

### width

#### Get Signature

> **get** **width**(): `number`

Defined in: [common/space/space.ts:48](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/space/space.ts#L48)

Gets the width of the space.

##### Returns

`number`

The width of the space.

## Methods

### setValue()

> **setValue**(`width`, `height`): `this`

Defined in: [common/space/space.ts:66](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/common/space/space.ts#L66)

Sets the dimensions of the space.

#### Parameters

##### width

`number`

The new width of the space.

##### height

`number`

The new height of the space.

#### Returns

`this`

The updated Space instance.
