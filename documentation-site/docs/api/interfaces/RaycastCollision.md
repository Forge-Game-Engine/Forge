# Interface: RaycastCollision

Defined in: [physics/raycast.ts:60](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/physics/raycast.ts#L60)

RaycastCollision interface that represents a collision between a ray and a body.

## Properties

### body

> **body**: `Body`

Defined in: [physics/raycast.ts:64](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/physics/raycast.ts#L64)

The body that was hit by the ray.

***

### normal

> **normal**: [`Vector2`](../classes/Vector2.md)

Defined in: [physics/raycast.ts:72](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/physics/raycast.ts#L72)

The normal vector of the edge at the point of intersection.

***

### point

> **point**: [`Vector2`](../classes/Vector2.md)

Defined in: [physics/raycast.ts:68](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/physics/raycast.ts#L68)

The point of intersection between the ray and the body.

***

### vertices

> **vertices**: [`Vector2`](../classes/Vector2.md)[]

Defined in: [physics/raycast.ts:76](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/physics/raycast.ts#L76)

The vertices of the body that were hit by the ray.
