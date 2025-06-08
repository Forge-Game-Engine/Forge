# Class: PhysicsBodyComponent

Defined in: [physics/components/physics-body-component.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/physics/components/physics-body-component.ts#L8)

Component to manage physics bodies in the game.
This component is used to represent a physics body in the game.

## Implements

- [`Component`](../interfaces/Component.md)

## Constructors

### Constructor

> **new PhysicsBodyComponent**(`physicsBody`): `PhysicsBodyComponent`

Defined in: [physics/components/physics-body-component.ts:23](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/physics/components/physics-body-component.ts#L23)

Creates an instance of PhysicsBodyComponent.
This component is used to represent a physics body in the game.

#### Parameters

##### physicsBody

`Body`

#### Returns

`PhysicsBodyComponent`

## Properties

### name

> **name**: `symbol`

Defined in: [physics/components/physics-body-component.ts:9](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/physics/components/physics-body-component.ts#L9)

The unique name of the component.

#### Implementation of

[`Component`](../interfaces/Component.md).[`name`](../interfaces/Component.md#name)

***

### physicsBody

> **physicsBody**: `Body`

Defined in: [physics/components/physics-body-component.ts:15](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/physics/components/physics-body-component.ts#L15)

The physics body associated with this component.
This is the Matter.js body that represents the physical properties of the entity.

***

### symbol

> `readonly` `static` **symbol**: *typeof* [`symbol`](#symbol)

Defined in: [physics/components/physics-body-component.ts:17](https://github.com/Forge-Game-Engine/Forge/blob/04af294b0d108e7e60d1ae9f40eaa3ca76ca176a/src/physics/components/physics-body-component.ts#L17)
