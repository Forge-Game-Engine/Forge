---
sidebar_position: 1
---

# Game

[`Game`](/Forge/docs/api/classes/Game) runs the game loop. Every animation
frame (`requestAnimationFrame`), it updates its [`Time`](../common/time.md)
and calls `update()` on each of its [worlds](world.md), so their systems run
once per frame. It doesn't render or resize anything itself.

## Creating a game

[`createGame`](/Forge/docs/api/functions/createGame) creates a `Game` with
one `EcsWorld`, a `Time`, a canvas appended to the element with the given
id, a [`RenderContext`](/Forge/docs/api/classes/RenderContext) for that
canvas, and a resize sync that keeps the canvas sized to the element:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';

const { game, world, time, renderContext, resizeSync } = createGame('game');
```

It throws if no element has the given id.

### Creating a game manually

The `Game` constructor takes a `Time`, an array of worlds and the HTML
element the game belongs to, and creates no canvas or render context:

```ts
import { Time } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Game } from '@forge-game-engine/forge/utilities';

const container = document.getElementById('game');

if (!container) {
  throw new Error('No element with id "game".');
}

const time = new Time();
const gameplayWorld = new EcsWorld();
const uiWorld = new EcsWorld();

const game = new Game(time, [gameplayWorld, uiWorld], container);
```

Each frame, the worlds are updated in array order. `game.container` is the
element passed in, for code that needs a DOM element for the game, such as
an input source or an overlay. `Game` doesn't use it.

## Running the game

`run()` starts the loop:

```ts
game.run();
```

Each frame, `Time` is updated with `performance.now()`, then each world's
`update()` runs. The first frame's delta time is measured from the
`run()` call. Calling `run()` while the game is running does nothing.

Without a `Game`, call `world.update()` directly to run one tick, for
example in a unit test.

## Keeping the canvas sized to its container

`createGame` returns a `resizeSync` that resizes its `RenderContext` when
the container's size changes. With a manually created `Game`, start one
with `createContainerResizeSync` (see
[Resizing with the container](../utils/create-container.md#resizing-with-the-container)).

## Stopping the game

`stop()` cancels the next frame and calls `stop()` on each world, which
runs every registered system's `cleanup` (see
[Releasing resources](system.md#acquiring-and-releasing-resources)):

```ts
game.stop();
resizeSync.stop();
```

`resizeSync.stop()` stops watching the container. The resize sync runs
independently of the `Game`, so stopping the game doesn't stop it.
