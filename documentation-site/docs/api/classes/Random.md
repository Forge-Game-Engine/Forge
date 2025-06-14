# Class: Random

Defined in: [math/random.ts:7](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/random.ts#L7)

The `Random` class provides methods to generate random integers and floats
using a seeded random number generator.

## Constructors

### Constructor

> **new Random**(`seed`): `Random`

Defined in: [math/random.ts:14](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/random.ts#L14)

Creates a new instance of the `Random` class with the given seed.

#### Parameters

##### seed

`string` = `'seed'`

The seed for the random number generator.

#### Returns

`Random`

## Methods

### randomFloat()

> **randomFloat**(`min`, `max`): `number`

Defined in: [math/random.ts:42](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/random.ts#L42)

Generates a random float between the specified minimum and maximum values (inclusive).

#### Parameters

##### min

`number`

The minimum value (inclusive).

##### max

`number`

The maximum value (inclusive).

#### Returns

`number`

A random float between min and max.

***

### randomInt()

> **randomInt**(`min`, `max`): `number`

Defined in: [math/random.ts:32](https://github.com/Forge-Game-Engine/Forge/blob/5b90130e2e0c679482e3bd31c32cbea9b4cffce1/src/math/random.ts#L32)

Generates a random integer between the specified minimum and maximum values (inclusive).

#### Parameters

##### min

`number`

The minimum value (inclusive).

##### max

`number`

The maximum value (inclusive).

#### Returns

`number`

A random integer between min and max.
