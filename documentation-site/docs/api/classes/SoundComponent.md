# Class: SoundComponent

Defined in: [audio/components/sound-component.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/audio/components/sound-component.ts#L7)

Component to manage sounds in the game.

## Implements

- [`Component`](../interfaces/Component.md)

## Constructors

### Constructor

> **new SoundComponent**(`options`, `playSound`): `SoundComponent`

Defined in: [audio/components/sound-component.ts:27](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/audio/components/sound-component.ts#L27)

Creates an instance of SoundComponent.

#### Parameters

##### options

`HowlOptions`

The HowlOptions to configure the sound.

##### playSound

`boolean` = `false`

A boolean indicating whether to play the sound immediately.

#### Returns

`SoundComponent`

#### See

[Documentation](https://github.com/goldfire/howler.js#documentation|Howler.js)

#### Example

```ts
const soundComponent = new SoundComponent({
  src: ['sound.mp3'],
  volume: 0.5,
}, true);
```

## Properties

### name

> **name**: `symbol`

Defined in: [audio/components/sound-component.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/audio/components/sound-component.ts#L8)

The unique name of the component.

#### Implementation of

[`Component`](../interfaces/Component.md).[`name`](../interfaces/Component.md#name)

***

### playSound

> **playSound**: `boolean`

Defined in: [audio/components/sound-component.ts:10](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/audio/components/sound-component.ts#L10)

***

### sound

> **sound**: `Howl`

Defined in: [audio/components/sound-component.ts:9](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/audio/components/sound-component.ts#L9)

***

### symbol

> `readonly` `static` **symbol**: *typeof* [`symbol`](#symbol)

Defined in: [audio/components/sound-component.ts:12](https://github.com/Forge-Game-Engine/Forge/blob/7a38cd584d26e8fac97f61bf2359fb32ea34a7fc/src/audio/components/sound-component.ts#L12)
