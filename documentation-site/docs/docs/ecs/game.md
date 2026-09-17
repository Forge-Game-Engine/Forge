---
sidebar_position: 1
---

# Game

A `Game` instance manages the game loop: a `Time` instance and one or more
`World`s (typically `EcsWorld` instances), driven by `requestAnimationFrame`.
Use `Game` when you want a continuous frame-driven update for systems that
should run each frame.

`Game` is a simple loop orchestrator - it has no notion of rendering or
resizing, and doesn't depend on `EcsWorld` or `RenderContext` directly. It
accepts any object matching the `World` type (an `Updatable` and a
`Stoppable`) as a world, so a single game can drive more than one, e.g. a
gameplay world alongside a separate UI overlay world.

Why use `Game` instead of only an `EcsWorld`?

- `EcsWorld` is solely a container for entities, components, and systems. It exposes `update()` which runs registered systems for a single tick.
- `Game` wraps a `Time` and one or more worlds, calling `update()` on each of them every animation frame, and handles starting and stopping the loop.
- For tests, server-side logic, or single-step updates you can call `world.update()` directly without a `Game` instance.

`Game` also exposes `container`: the HTML element associated with the game
(e.g. the one containing its canvas), for consumers that need a DOM anchor -
an input source, an overlay element appended alongside the canvas, etc.
`Game` itself does nothing with it.

## Resizing

Keeping a canvas sized to its container isn't `Game`'s job - it's a separate,
optional concern handled by
[`createContainerResizeSync`](/Forge/docs/api/functions/createContainerResizeSync),
which `createGame` wires up automatically for the `RenderContext` it creates.

`createContainerResizeSync(container, resizables)` watches `container` with a
`ResizeObserver` and calls `resize()` on every resizable (typically a
`RenderContext`) whenever the container's size actually changes. This means a
game embedded in a resizable page - or one whose container changes size for
any other reason, like a fullscreen toggle - stays correctly sized without
you writing your own resize handling, and without restarting the game (which
would reset all engine and game state). Since the camera's projection matrix
and the UI layout system already read `RenderContext.width`/`height` fresh
every frame, both follow the resize automatically.

Watching starts immediately when `createContainerResizeSync` is called, and
runs independently of whether the `Game` it's paired with is running or even
exists - it's plain DOM observation, nothing more. Call the returned
`stop()` to disconnect it early, e.g. when switching to a headless mode with
no canvas left to keep sized. It's safe to never call `stop()` at all if
`container` is simply removed from the DOM: browsers silently drop a
`ResizeObserver`'s registration for a target once nothing else references
it, so it won't keep the container alive.

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

const { game, world, time, renderContext, resizeSync } = createGame('game');

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
