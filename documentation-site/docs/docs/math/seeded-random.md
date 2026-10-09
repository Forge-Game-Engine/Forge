---
sidebar_position: 7
---

# Seeded Random Numbers

[`Random`](/Forge/docs/api/classes/Random) is a seeded pseudo-random number
generator. Two `Random` instances created with the same seed return the same
sequence of values, so a seed reproduces a run of randomized content, such
as a generated level or a sequence of spawns.

## Creating a generator

Pass the seed string to the constructor:

```ts
import { Random } from '@forge-game-engine/forge/math';

const random = new Random('level-42');
```

:::caution
Without an argument, the seed is `'seed'`, so every `Random` created without
a seed returns the same sequence. Give each generator that needs its own
values a different seed.
:::

## Generating numbers

[`randomInt(min, max)`](/Forge/docs/api/classes/Random#randomint) returns an
integer from `min` to `max`, including both.
[`randomFloat(min, max)`](/Forge/docs/api/classes/Random#randomfloat)
returns a number from `min` up to, but not including, `max`:

```ts
const index = random.randomInt(0, items.length - 1);
const size = random.randomFloat(40, 90);
```

Each call advances the generator, so the values depend on the seed and on
the order of the calls.
