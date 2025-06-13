# Function: createProjectionMatrix()

> **createProjectionMatrix**(`width`, `height`): [`Matrix3x3`](../classes/Matrix3x3.md)

Defined in: [rendering/shaders/utils/create-projection-matrix.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/shaders/utils/create-projection-matrix.ts#L10)

Creates a projection matrix for mapping 0..width to -1..1 in X and 0..height to -1..1 in Y.

## Parameters

### width

`number`

The width of the projection area.

### height

`number`

The height of the projection area.

## Returns

[`Matrix3x3`](../classes/Matrix3x3.md)

A 3x3 projection matrix.
