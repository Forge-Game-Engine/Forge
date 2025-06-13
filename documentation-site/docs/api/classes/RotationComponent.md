# Class: RotationComponent

Defined in: [common/components/rotation-component.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/common/components/rotation-component.ts#L7)

Component to represent the rotation of an entity in 2D space.

## Implements

- [`Component`](../interfaces/Component.md)

## Constructors

### Constructor

> **new RotationComponent**(`degrees`): `RotationComponent`

Defined in: [common/components/rotation-component.ts:20](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/common/components/rotation-component.ts#L20)

Creates an instance of RotationComponent.

#### Parameters

##### degrees

`number`

The rotation angle in degrees.

#### Returns

`RotationComponent`

#### Example

```ts
const rotation = new RotationComponent(90);
console.log(rotation.radians); // 1.5708 (approximately)
```

## Properties

### name

> **name**: `symbol`

Defined in: [common/components/rotation-component.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/common/components/rotation-component.ts#L8)

The unique name of the component.

#### Implementation of

[`Component`](../interfaces/Component.md).[`name`](../interfaces/Component.md#name)

***

### radians

> **radians**: `number`

Defined in: [common/components/rotation-component.ts:9](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/common/components/rotation-component.ts#L9)

***

### symbol

> `readonly` `static` **symbol**: *typeof* [`symbol`](#symbol)

Defined in: [common/components/rotation-component.ts:11](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/common/components/rotation-component.ts#L11)
