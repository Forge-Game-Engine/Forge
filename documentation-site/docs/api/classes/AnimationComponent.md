# Class: AnimationComponent

Defined in: [animations/components/animation-component.ts:77](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/animations/components/animation-component.ts#L77)

Represents an animation component that manages a collection of animations.

## Implements

- [`Component`](../interfaces/Component.md)

## Constructors

### Constructor

> **new AnimationComponent**(`animations`): `AnimationComponent`

Defined in: [animations/components/animation-component.ts:103](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/animations/components/animation-component.ts#L103)

Creates an instance of AnimationComponent.

#### Parameters

##### animations

An AnimatedProperty or array of AnimatedProperties to initialize the component with.

[`AnimatedProperty`](../interfaces/AnimatedProperty.md) | [`AnimatedProperty`](../interfaces/AnimatedProperty.md)[]

#### Returns

`AnimationComponent`

#### Example

```ts
const animation = new AnimationComponent({
    duration: 1000,
    updateCallback: (value) => console.log(value),
    easing: (t) => t * t,
    loop: 'loop',
    loopCount: 3,
  });
```

## Properties

### name

> **name**: `symbol`

Defined in: [animations/components/animation-component.ts:78](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/animations/components/animation-component.ts#L78)

The unique name of the component.

#### Implementation of

[`Component`](../interfaces/Component.md).[`name`](../interfaces/Component.md#name)

***

### symbol

> `readonly` `static` **symbol**: *typeof* [`symbol`](#symbol)

Defined in: [animations/components/animation-component.ts:81](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/animations/components/animation-component.ts#L81)

## Accessors

### animations

#### Get Signature

> **get** **animations**(): `Required`\<[`AnimatedProperty`](../interfaces/AnimatedProperty.md)\>[]

Defined in: [animations/components/animation-component.ts:87](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/animations/components/animation-component.ts#L87)

Gets the list of animations managed by this component.

##### Returns

`Required`\<[`AnimatedProperty`](../interfaces/AnimatedProperty.md)\>[]

An array of AnimatedProperty objects.

## Methods

### addAnimation()

> **addAnimation**(`animation`): `void`

Defined in: [animations/components/animation-component.ts:116](https://github.com/Forge-Game-Engine/Forge/blob/80c88dbc1226e2ea185d187b85121eb9c3da7ead/src/animations/components/animation-component.ts#L116)

Adds a new animation to the component.

#### Parameters

##### animation

[`AnimatedProperty`](../interfaces/AnimatedProperty.md)

The AnimatedProperty object to add.

#### Returns

`void`
