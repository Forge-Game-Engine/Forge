# Class: Sprite

Defined in: [rendering/sprite.ts:39](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/sprite.ts#L39)

The `Sprite` class represents a sprite in the rendering system.

## Constructors

### Constructor

> **new Sprite**(`options`): `Sprite`

Defined in: [rendering/sprite.ts:62](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/sprite.ts#L62)

Constructs a new instance of the `Sprite` class.

#### Parameters

##### options

[`SpriteOptions`](../type-aliases/SpriteOptions.md)

The options for creating the sprite.

#### Returns

`Sprite`

## Properties

### bleed

> **bleed**: `number`

Defined in: [rendering/sprite.ts:44](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/sprite.ts#L44)

The bleed value applied to the sprite.

***

### height

> **height**: `number`

Defined in: [rendering/sprite.ts:50](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/sprite.ts#L50)

The height of the sprite, including the bleed value.

***

### pivot

> **pivot**: [`Vector2`](Vector2.md)

Defined in: [rendering/sprite.ts:53](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/sprite.ts#L53)

The pivot point of the sprite.

***

### renderable

> `readonly` **renderable**: [`Renderable`](Renderable.md)

Defined in: [rendering/sprite.ts:56](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/sprite.ts#L56)

The sprite material used for rendering.

***

### renderLayer

> **renderLayer**: [`ForgeRenderLayer`](ForgeRenderLayer.md)

Defined in: [rendering/sprite.ts:41](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/sprite.ts#L41)

The render layer to which the sprite belongs.

***

### width

> **width**: `number`

Defined in: [rendering/sprite.ts:47](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/rendering/sprite.ts#L47)

The width of the sprite, including the bleed value.
