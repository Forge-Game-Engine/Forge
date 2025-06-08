# Class: Ray

Defined in: [physics/raycast.ts:82](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L82)

Ray class that represents a ray in 2D space.

## Constructors

### Constructor

> **new Ray**(`start`, `end`): `Ray`

Defined in: [physics/raycast.ts:92](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L92)

Creates a new Ray object.

#### Parameters

##### start

[`Vector2`](Vector2.md)

The starting point of the ray

##### end

[`Vector2`](Vector2.md)

The ending point of the ray

#### Returns

`Ray`

## Properties

### end

> **end**: [`Vector2`](Vector2.md)

Defined in: [physics/raycast.ts:84](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L84)

***

### start

> **start**: [`Vector2`](Vector2.md)

Defined in: [physics/raycast.ts:83](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L83)

***

### vertices

> **vertices**: [`Vector2`](Vector2.md)[] = `[]`

Defined in: [physics/raycast.ts:85](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L85)

## Accessors

### difference

#### Get Signature

> **get** **difference**(): [`Vector2`](Vector2.md)

Defined in: [physics/raycast.ts:162](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L162)

##### Returns

[`Vector2`](Vector2.md)

***

### isHorizontal

#### Get Signature

> **get** **isHorizontal**(): `boolean`

Defined in: [physics/raycast.ts:177](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L177)

##### Returns

`boolean`

***

### isVertical

#### Get Signature

> **get** **isVertical**(): `boolean`

Defined in: [physics/raycast.ts:181](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L181)

##### Returns

`boolean`

***

### offsetY

#### Get Signature

> **get** **offsetY**(): `number`

Defined in: [physics/raycast.ts:170](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L170)

##### Returns

`number`

***

### slope

#### Get Signature

> **get** **slope**(): `number`

Defined in: [physics/raycast.ts:166](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L166)

##### Returns

`number`

## Methods

### calculateNormal()

> **calculateNormal**(`referencePoint`): [`Vector2`](Vector2.md)

Defined in: [physics/raycast.ts:144](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L144)

Calculates the normal vector of the ray at the specified reference point.

#### Parameters

##### referencePoint

[`Vector2`](Vector2.md)

The reference point to calculate the normal vector from

#### Returns

[`Vector2`](Vector2.md)

The normal vector of the ray at the specified reference point

***

### pointInBounds()

> **pointInBounds**(`point`): `boolean`

Defined in: [physics/raycast.ts:126](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L126)

Checks if a point is within the bounds of the ray.

#### Parameters

##### point

[`Vector2`](Vector2.md)

The point to check

#### Returns

`boolean`

True if the point is within the bounds of the ray, false otherwise

***

### xValueAt()

> **xValueAt**(`y`): `number`

Defined in: [physics/raycast.ts:114](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L114)

Returns the x value on the ray at the specified y.

#### Parameters

##### y

`number`

The y value to check

#### Returns

`number`

The x value on the ray at the specified y

***

### yValueAt()

> **yValueAt**(`x`): `number`

Defined in: [physics/raycast.ts:102](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L102)

Returns the y value on the ray at the specified x.

#### Parameters

##### x

`number`

The x value to check

#### Returns

`number`

The y value on the ray at the specified x

***

### bodyCollisions()

> `static` **bodyCollisions**(`rayA`, `body`): [`RaycastCollision`](../interfaces/RaycastCollision.md)[]

Defined in: [physics/raycast.ts:274](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L274)

#### Parameters

##### rayA

`Ray`

##### body

`Body`

#### Returns

[`RaycastCollision`](../interfaces/RaycastCollision.md)[]

***

### bodyEdges()

> `static` **bodyEdges**(`body`): `Ray`[]

Defined in: [physics/raycast.ts:237](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L237)

#### Parameters

##### body

`Body`

#### Returns

`Ray`[]

***

### collisionPoint()

> `static` **collisionPoint**(`rayA`, `rayB`): `null` \| [`Vector2`](Vector2.md)

Defined in: [physics/raycast.ts:219](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L219)

#### Parameters

##### rayA

`Ray`

##### rayB

`Ray`

#### Returns

`null` \| [`Vector2`](Vector2.md)

***

### intersect()

> `static` **intersect**(`rayA`, `rayB`): `null` \| [`Vector2`](Vector2.md)

Defined in: [physics/raycast.ts:185](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/physics/raycast.ts#L185)

#### Parameters

##### rayA

`Ray`

##### rayB

`Ray`

#### Returns

`null` \| [`Vector2`](Vector2.md)
