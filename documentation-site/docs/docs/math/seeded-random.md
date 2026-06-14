---
sidebar_position: 5
---

# Seeded Random Numbers

[`Random`](/Forge/docs/api/classes/Random) wraps a seeded pseudo-random
number generator ([`seedrandom`](https://www.npmjs.com/package/seedrandom))
behind [`randomInt(min, max)`](/Forge/docs/api/classes/Random#randomint) and
[`randomFloat(min, max)`](/Forge/docs/api/classes/Random#randomfloat), both
inclusive of `min` and `max`.

## Why seeded randomness

Given the same seed, a `Random` instance produces the exact same sequence of
values every time. This makes randomized gameplay (procedural levels, loot
rolls, enemy spawns) reproducible: log the seed used for a run, and you can
replay or debug that exact run later. The demo uses a single shared `Random`
instance to pick spawn positions, sizes, and shapes for falling objects:

```ts
import { Random } from '@forge-game-engine/forge/math';

const random = new Random();

const size = random.randomFloat(40, 90);
const spawnX = random.randomFloat(0, worldWidth - size);
const shapeIndex = random.randomInt(0, shapeSpawners.length - 1);
```

:::caution
`new Random()` without an argument defaults to the seed `'seed'`. Two
`Random` instances created without an explicit seed will produce the
**identical** sequence of values. This is convenient for tests (construct a
fresh, deterministic `Random` in `beforeEach`), but if you want independent
randomness in different parts of your game, either share a single `Random`
instance or pass each one a distinct seed string.
:::
