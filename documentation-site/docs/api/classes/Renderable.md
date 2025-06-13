# Class: Renderable

Defined in: [rendering/renderable.ts:4](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/renderable.ts#L4)

## Constructors

### Constructor

> **new Renderable**(`geometry`, `material`): `Renderable`

Defined in: [rendering/renderable.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/renderable.ts#L8)

#### Parameters

##### geometry

[`Geometry`](Geometry.md)

##### material

[`Material`](Material.md)

#### Returns

`Renderable`

## Properties

### geometry

> **geometry**: [`Geometry`](Geometry.md)

Defined in: [rendering/renderable.ts:5](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/renderable.ts#L5)

***

### material

> **material**: [`Material`](Material.md)

Defined in: [rendering/renderable.ts:6](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/renderable.ts#L6)

## Methods

### bind()

> **bind**(`gl`): `void`

Defined in: [rendering/renderable.ts:17](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/renderable.ts#L17)

Prepares for drawing: binds material and geometry (including VAO).
The RenderSystem is still responsible for binding instance data & calling draw.

#### Parameters

##### gl

`WebGL2RenderingContext`

#### Returns

`void`
