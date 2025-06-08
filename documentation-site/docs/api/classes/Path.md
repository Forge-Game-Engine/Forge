# Class: Path

Defined in: [common/path/path.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/common/path/path.ts#L8)

Class to represent a path consisting of a series of 2D points.

## Implements

- `Iterable`\<[`Vector2`](Vector2.md)\>

## Constructors

### Constructor

> **new Path**(`path`): `Path`

Defined in: [common/path/path.ts:18](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/common/path/path.ts#L18)

Creates an instance of Path.

#### Parameters

##### path

[`Vector2`](Vector2.md)[] = `[]`

An array of Vector2 points representing the path.

#### Returns

`Path`

#### Example

```ts
const path = new Path([new Vector2(0, 0), new Vector2(1, 1)]);
console.log(path.length); // 2
```

## Properties

### path

> **path**: [`Vector2`](Vector2.md)[]

Defined in: [common/path/path.ts:9](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/common/path/path.ts#L9)

## Accessors

### first

#### Get Signature

> **get** **first**(): [`Vector2`](Vector2.md)

Defined in: [common/path/path.ts:61](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/common/path/path.ts#L61)

Gets the first point in the path.

##### Returns

[`Vector2`](Vector2.md)

The first point in the path.

***

### last

#### Get Signature

> **get** **last**(): `null` \| [`Vector2`](Vector2.md)

Defined in: [common/path/path.ts:69](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/common/path/path.ts#L69)

Gets the last point in the path.

##### Returns

`null` \| [`Vector2`](Vector2.md)

The last point in the path.

***

### length

#### Get Signature

> **get** **length**(): `number`

Defined in: [common/path/path.ts:77](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/common/path/path.ts#L77)

Gets the number of points in the path.

##### Returns

`number`

The number of points in the path.

## Methods

### \[iterator\]()

> **\[iterator\]**(): `Iterator`\<[`Vector2`](Vector2.md)\>

Defined in: [common/path/path.ts:89](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/common/path/path.ts#L89)

Returns an iterator for the path.

#### Returns

`Iterator`\<[`Vector2`](Vector2.md)\>

An iterator for the path.

#### Example

```ts
for (const point of path) {
  console.log(point);
}
```

#### Implementation of

`Iterable.[iterator]`

***

### at()

> **at**(`index`): [`Vector2`](Vector2.md)

Defined in: [common/path/path.ts:27](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/common/path/path.ts#L27)

Gets the point at the specified index.

#### Parameters

##### index

`number`

The index of the point to retrieve.

#### Returns

[`Vector2`](Vector2.md)

The point at the specified index.

***

### map()

> **map**\<`T`\>(`callback`): `T`[]

Defined in: [common/path/path.ts:53](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/common/path/path.ts#L53)

Maps the path to a new array using the provided callback function.

#### Type Parameters

##### T

`T`

#### Parameters

##### callback

`MapPathCallback`\<`T`\>

The callback function to apply to each point.

#### Returns

`T`[]

A new array with the results of calling the callback on each point.

#### Example

```ts
const pointStrings = path.map(point => `[${point.x},${point.y}]`);
console.log(pointStrings); // ['[0,0]', '[1,1]']
```

***

### push()

> **push**(`point`): `void`

Defined in: [common/path/path.ts:41](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/common/path/path.ts#L41)

Adds a point to the end of the path.

#### Parameters

##### point

[`Vector2`](Vector2.md)

The point to add.

#### Returns

`void`
