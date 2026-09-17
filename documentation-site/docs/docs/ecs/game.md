---
sidebar_position: 1
---

# Game

A `Game` instance manages the game loop and coordinates updates for `Time`,
one or more updatable/stoppable objects (typically `EcsWorld` instances), and
any resizable objects (typically `RenderContext` instances) tied to a DOM
container. Use `Game` when you want a continuous frame-driven update
(requestAnimationFrame) for systems that should run each frame.

`Game` doesn't depend on `EcsWorld` or `RenderContext` directly - it accepts
any object implementing the `Updatable`/`Stoppable` interfaces (for worlds)
and the `Resizable` interface (for resizables), so a single game can drive
more than one world (e.g. a gameplay world alongside a separate UI overlay
world) and keep more than one render context in sync with its container.

Why use `Game` instead of only an `EcsWorld`?

- `EcsWorld` is solely a container for entities, components, and systems. It exposes `update()` which runs registered systems for a single tick.
- `Game` wraps a `Time` and one or more worlds, calling `update()` on each of them every animation frame, handling `requestAnimationFrame`, starting and stopping the loop, and providing a convenient place to attach rendering (canvas) logic.
- For tests, server-side logic, or single-step updates you can call `world.update()` directly without a `Game` instance.

## Resizing

If constructed with one or more resizables (as `createGame` does
automatically, passing the `RenderContext` it creates), `Game` keeps each
one's canvas sized to its container: while the game is running, a
`ResizeObserver` watches the container element and calls `resize()` on every
resizable whenever the container's size actually changes. This means a game
embedded in a resizable page - or one whose container changes size for any
other reason, like a fullscreen toggle - stays correctly sized without you
writing your own resize handling, and without restarting the game (which
would reset all engine and game state). Since the camera's projection matrix
and the UI layout system already read `RenderContext.width`/`height` fresh
every frame, both follow the resize automatically.

The observer starts in `run()` and disconnects in `stop()`. Passing no
resizables to `Game`'s constructor (or building a `RenderContext` manually
without going through `createGame`) simply skips this - useful for a `Game`
that drives systems with no canvas of its own.

The actual resize happens on the next animation frame after the
`ResizeObserver` notification, not synchronously inside its callback:
resizing the canvas is itself a layout-affecting DOM mutation, and doing
that directly in response to a resize notification is what triggers the
browser's `ResizeObserver loop completed with undelivered notifications`
error. This adds at most one frame of latency before the canvas catches up,
which isn't visible in practice.

This only resizes the canvas and the default framebuffer's viewport. Two
things it does *not* do for you, since the engine has no way to know they're
meant to track the canvas:

- A camera's own [`RenderTarget`](/Forge/docs/api/classes/RenderTarget) (used
  for multi-pass effects like bloom or blur) is a fixed-size texture that
  stays exactly as it was created - see the caution in
  [Multipass Rendering](../rendering/multipass-rendering.md) for how to keep
  one in sync.
- Anything you sized once from `calculateVisibleWorldSize`/`RenderContext.width`/
  `height` at startup (a background quad meant to always fill the camera's
  view, a shader uniform driven by the canvas resolution) needs to be
  recomputed by your own system each time those dimensions change, the same
  way `createUiLayoutEcsSystem` already does for UI.

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

const game = new Game(time, [world], container);

// add systems, load assets, etc.
game.run();
```
