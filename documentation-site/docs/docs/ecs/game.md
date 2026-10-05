---
sidebar_position: 1
---

# Game

A `Game` instance manages the game loop: a `Time` instance and one or more
`EcsWorld`s, driven by `requestAnimationFrame`. Use `Game` when you want a
continuous frame-driven update for systems that should run each frame.

`Game` is a simple loop orchestrator - it has no notion of rendering or
resizing, and doesn't depend on `RenderContext` at all. It takes an array of
worlds rather than a single one, so a single game can drive more than one,
e.g. a gameplay world alongside a separate UI overlay world.

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
`RenderContext`) whenever the container's size changes. It also watches the
display's `devicePixelRatio` (via a `matchMedia('(resolution: …dppx)')`
query) and resizes again whenever that changes - browser zoom, or dragging
the window onto a monitor with a different scale factor - even when the
container's CSS size stays the same, so the canvas keeps rendering at the
display's native resolution (see
[High-DPI displays](../rendering/world-units-and-cameras.md#high-dpi-displays)).
This means a
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

Resizing the `RenderContext` also resizes every camera render target created
with `renderContext.createRenderTarget()` (see
[Multipass Rendering](../rendering/multipass-rendering.md#rendering-a-camera-off-screen)),
in the same call, so off-screen effects like bloom and blur keep matching the
canvas.

Anything you sized once from `calculateVisibleWorldSize`/`RenderContext.width`/
`height` at startup (a background quad meant to always fill the camera's
view, a shader uniform driven by the canvas resolution) isn't resized for you:
your own system needs to recompute it each time those dimensions change, the
same way `createUiLayoutEcsSystem` already does for UI.

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

`createGame` takes an optional second argument. Its `renderContext` field is
forwarded to [`createRenderContext`](/Forge/docs/api/functions/createRenderContext),
so you can, for example, cap the render resolution on high-DPI displays (see
[High-DPI displays](../rendering/world-units-and-cameras.md#high-dpi-displays)):

```ts
const { game, renderContext } = createGame('game', {
  renderContext: { maxPixelRatio: 1.5 },
});
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
