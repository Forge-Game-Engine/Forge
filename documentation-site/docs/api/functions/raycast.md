# Function: raycast()

> **raycast**(`bodies`, `start`, `end`, `sort`): [`RaycastCollision`](../interfaces/RaycastCollision.md)[]

Defined in: [physics/raycast.ts:18](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/physics/raycast.ts#L18)

Raycast function that returns an array of RaycastCollision objects
that represent the intersections between a ray and the bodies in the world.

## Parameters

### bodies

`Body`[]

The array of Matter.Body objects to check for intersections

### start

[`Vector2`](../classes/Vector2.md)

The starting point of the ray

### end

[`Vector2`](../classes/Vector2.md)

The ending point of the ray

### sort

`boolean` = `true`

Whether to sort the results by distance from the start point

## Returns

[`RaycastCollision`](../interfaces/RaycastCollision.md)[]

An array of RaycastCollision objects
