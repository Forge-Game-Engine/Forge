---
sidebar_position: 1
---

# Game

A `Game` instance manages the game loop and coordinates updates for `Time`, the `EcsWorld`, and any rendering context tied to a DOM container. Use `Game` when you want a continuous frame-driven update (requestAnimationFrame) for systems that should run each frame.

Why use `Game` instead of only an `EcsWorld`?

- `EcsWorld` is solely a container for entities, components, and systems. It exposes `update()` which runs registered systems for a single tick.
- `Game` wraps a `Time` and an `EcsWorld` and calls `world.update()` on each animation frame, handling `requestAnimationFrame`, starting and stopping the loop, and providing a convenient place to attach rendering (canvas) logic.
- For tests, server-side logic, or single-step updates you can call `world.update()` directly without a `Game` instance.

:::tip
Use the [`createGame`](/Forge/docs/api/functions/createGame) helper for quick setup.
:::

Using the helper:

```ts
import { createGame } from '@forge-game-engine/forge/utilities/create-game';

const { game, world, time, renderContext } = createGame('game');

// add systems, load assets, etc.

game.run();
```

Manual setup (when you need fine-grained control):

```ts
import { Time } from '@forge-game-engine/forge/common/time';
import { Game } from '@forge-game-engine/forge/utilities/game';
import { EcsWorld } from '@forge-game-engine/forge/ecs/ecs-world';

const time = new Time();
const world = new EcsWorld();
const container = document.getElementById('game') as HTMLElement;

const game = new Game(time, world, container);

// add systems, load assets, etc.
game.run();
```
