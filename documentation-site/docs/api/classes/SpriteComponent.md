# Class: SpriteComponent

Defined in: [rendering/components/sprite-component.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-component.ts#L8)

The `SpriteComponent` class implements the `Component` interface and represents
a component that contains a `Sprite`.

## Implements

- [`Component`](../interfaces/Component.md)

## Constructors

### Constructor

> **new SpriteComponent**(`sprite`, `enabled`): `SpriteComponent`

Defined in: [rendering/components/sprite-component.ts:26](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-component.ts#L26)

Constructs a new instance of the `SpriteComponent` class with the given `Sprite`.

#### Parameters

##### sprite

[`Sprite`](Sprite.md)

The `Sprite` instance to associate with this component.

##### enabled

`boolean` = `true`

Indicates whether the sprite is enabled or not (default: true).

#### Returns

`SpriteComponent`

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [rendering/components/sprite-component.ts:16](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-component.ts#L16)

Indicates whether the sprite is enabled or not.

***

### name

> **name**: `symbol`

Defined in: [rendering/components/sprite-component.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-component.ts#L10)

The name property holds the unique symbol for this component.

#### Implementation of

[`Component`](../interfaces/Component.md).[`name`](../interfaces/Component.md#name)

***

### sprite

> **sprite**: [`Sprite`](Sprite.md)

Defined in: [rendering/components/sprite-component.ts:13](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-component.ts#L13)

The `Sprite` instance associated with this component.

***

### symbol

> `readonly` `static` **symbol**: *typeof* [`symbol`](#symbol)

Defined in: [rendering/components/sprite-component.ts:19](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/rendering/components/sprite-component.ts#L19)

A static symbol property that uniquely identifies the `SpriteComponent`.
