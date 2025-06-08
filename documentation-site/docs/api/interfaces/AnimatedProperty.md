# Interface: AnimatedProperty

Defined in: [animations/components/animation-component.ts:8](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/animations/components/animation-component.ts#L8)

Represents the properties of an animated object.

## Properties

### duration

> **duration**: `number`

Defined in: [animations/components/animation-component.ts:30](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/animations/components/animation-component.ts#L30)

The duration of the animation in milliseconds.

***

### easing()?

> `optional` **easing**: (`t`) => `number`

Defined in: [animations/components/animation-component.ts:42](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/animations/components/animation-component.ts#L42)

The easing function to use for the animation.

#### Parameters

##### t

`number`

#### Returns

`number`

#### Default

```ts
linear
```

***

### elapsed?

> `optional` **elapsed**: `number`

Defined in: [animations/components/animation-component.ts:25](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/animations/components/animation-component.ts#L25)

The elapsed time of the animation.

#### Default

```ts
0
```

***

### endValue?

> `optional` **endValue**: `number`

Defined in: [animations/components/animation-component.ts:19](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/animations/components/animation-component.ts#L19)

The ending value of the animation.

#### Default

```ts
1
```

***

### finishedCallback()?

> `optional` **finishedCallback**: () => `void`

Defined in: [animations/components/animation-component.ts:59](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/animations/components/animation-component.ts#L59)

The callback function to call when the animation is finished.

#### Returns

`void`

***

### loop?

> `optional` **loop**: [`LoopMode`](../type-aliases/LoopMode.md)

Defined in: [animations/components/animation-component.ts:48](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/animations/components/animation-component.ts#L48)

The loop mode of the animation.

#### Default

```ts
'none'
```

***

### loopCount?

> `optional` **loopCount**: `number`

Defined in: [animations/components/animation-component.ts:54](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/animations/components/animation-component.ts#L54)

The number of times the animation should loop. -1 means that it will loop indefinitely.

#### Default

```ts
-1
```

***

### startValue?

> `optional` **startValue**: `number`

Defined in: [animations/components/animation-component.ts:13](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/animations/components/animation-component.ts#L13)

The starting value of the animation.

#### Default

```ts
0
```

***

### updateCallback()

> **updateCallback**: (`value`) => `void`

Defined in: [animations/components/animation-component.ts:36](https://github.com/Forge-Game-Engine/Forge/blob/6a4c05c6b58848e53a4f2ca7d9cd2f9b6c10e5ac/src/animations/components/animation-component.ts#L36)

The callback function to update the animated value.

#### Parameters

##### value

`number`

The current value of the animation.

#### Returns

`void`
