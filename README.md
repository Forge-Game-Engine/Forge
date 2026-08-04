# Forge

![logo](assets/forge-banner.png)

Forge is a browser-based, code-only game engine. It has everything you'd
expect from an engine, including rendering, audio, input, animations, an
Entity-Component-System (ECS) core, physics, and more.

[Documentation](https://forge-game-engine.github.io/Forge/) ·
[Live demos](https://forge-game-engine.github.io/Forge/demos)

## Getting started

```sh
npm install @forge-game-engine/forge
```

Forge's ECS separates data (components) from behavior (systems). Here's a
minimal world with one entity that spins in place:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';
import {
  addPositionComponent,
  addRotationComponent,
  positionId,
  rotationId,
} from '@forge-game-engine/forge/common';

const { game, world, time } = createGame('game');

const entity = world.createEntity();

addPositionComponent(world, entity);
addRotationComponent(world, entity);

world.addSystem({
  query: [positionId, rotationId],
  update: (_world, { components: [positions, rotations] }) => {
    for (let i = 0; i < positions.length; i++) {
      positions[i].world.x = Math.sin(time.timeInSeconds) * 100;
      rotations[i].world = time.timeInSeconds;
    }
  },
});

game.run();
```

See the [ECS demo](https://forge-game-engine.github.io/Forge/demos/ecs) for
a runnable version with rendering, and the
[documentation](https://forge-game-engine.github.io/Forge/) for guides on
every subsystem.

Want to contribute? See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup,
verification steps, and commit/changelog conventions.

## What the engine is

The engine is where all the code is stored that is usable for most types of games. For example: the renderer, audio systems, animations, mouse pointer, etc.

## What the engine is not

The engine is not a place to store code that is hyper-specific to a game. For example: a system for collecting coins.

## What if my system is specific to a particular genre?

You can make a separate folder or package outside of the engine.

## Acknowledgements

- [Howler.js](https://howlerjs.com/)
- [Vite](https://vite.dev/)
- [Kenny](https://www.kenney.nl/)
