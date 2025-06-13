# Class: Color

Defined in: [rendering/color.ts:6](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/color.ts#L6)

The `Color` class represents a color that can be created using RGB(A) or HSL(A).

## Constructors

### Constructor

> **new Color**(`r`, `g`, `b`, `a`): `Color`

Defined in: [rendering/color.ts:19](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/color.ts#L19)

Constructs a new `Color` instance using RGBA values.

#### Parameters

##### r

`number`

The red component (0-255).

##### g

`number`

The green component (0-255).

##### b

`number`

The blue component (0-255).

##### a

`number` = `1`

The alpha component (0-1). Defaults to 1 (fully opaque).

#### Returns

`Color`

## Accessors

### a

#### Get Signature

> **get** **a**(): `number`

Defined in: [rendering/color.ts:116](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/color.ts#L116)

Gets the alpha component of the color.

##### Returns

`number`

***

### b

#### Get Signature

> **get** **b**(): `number`

Defined in: [rendering/color.ts:109](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/color.ts#L109)

Gets the blue component of the color.

##### Returns

`number`

***

### g

#### Get Signature

> **get** **g**(): `number`

Defined in: [rendering/color.ts:102](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/color.ts#L102)

Gets the green component of the color.

##### Returns

`number`

***

### r

#### Get Signature

> **get** **r**(): `number`

Defined in: [rendering/color.ts:95](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/color.ts#L95)

Gets the red component of the color.

##### Returns

`number`

## Methods

### toFloat32Array()

> **toFloat32Array**(): `Float32Array`

Defined in: [rendering/color.ts:132](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/color.ts#L132)

Converts the color to a glsl-compatible float32 array.

#### Returns

`Float32Array`

The RGBA array (e.g. `[1, 0, 0, 1]` for red).

***

### toRGBAString()

> **toRGBAString**(): `string`

Defined in: [rendering/color.ts:124](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/color.ts#L124)

Converts the color to a CSS-compatible RGBA string.

#### Returns

`string`

The RGBA string (e.g., `rgba(255, 0, 0, 1)`).

***

### fromHSLA()

> `static` **fromHSLA**(`h`, `s`, `l`, `a`): `Color`

Defined in: [rendering/color.ts:58](https://github.com/Forge-Game-Engine/Forge/blob/4b66b21759bd3ab3aaf4c62b3e957c1bb43b7b58/src/rendering/color.ts#L58)

Creates a `Color` instance using HSLA values.

#### Parameters

##### h

`number`

The hue (0-360).

##### s

`number`

The saturation (0-100).

##### l

`number`

The lightness (0-100).

##### a

`number` = `1`

The alpha component (0-1). Defaults to 1 (fully opaque).

#### Returns

`Color`

A new `Color` instance.
