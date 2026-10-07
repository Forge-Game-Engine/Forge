# Page Containers

A game's canvas is placed in a container: an HTML element on the page.
[`createContainer`](/Forge/docs/api/functions/createContainer) creates one,
and [`createContainerResizeSync`](/Forge/docs/api/functions/createContainerResizeSync)
keeps render contexts the same size as their container.

## Creating a container

`createContainer(id)` creates a `div` with the given ID, appends it to the
document's `body` and returns it:

```ts
import {
  createContainer,
  createGame,
} from '@forge-game-engine/forge/utilities';

const container = createContainer('game');

container.style.width = '800px';
container.style.height = '600px';

const { game } = createGame('game');
```

A page that already has an element for the game passes that element's ID to
`createGame` instead.

:::caution
The `div` has no size of its own. The canvas is created at the container's
size, so give the container a width and height before creating the canvas
(here, before calling `createGame`).
:::

## Resizing with the container

`createContainerResizeSync(container, resizables)` calls `resize` on every
[`Resizable`](/Forge/docs/api/interfaces/Resizable) in `resizables`, such as
a [`RenderContext`](/Forge/docs/api/classes/RenderContext), whenever the
container's size or the display's device pixel ratio changes. Each
`resize` happens on the next animation frame after the change, with the
container's size in CSS pixels and the current device pixel ratio.

`createGame` starts one for the render context it creates and returns it as
`resizeSync`. For a render context created another way, start one yourself:

```ts
import { createContainerResizeSync } from '@forge-game-engine/forge/utilities';

const resizeSync = createContainerResizeSync(container, [renderContext]);
```

It runs from the moment it's created, whether or not a `Game` is running,
and skips a container whose width or height is `0`.

Resizing a `RenderContext` resizes its canvas, its viewport and the render
targets created with the `'canvas'` size (see
[Render Targets](../rendering/multipass-rendering.md) and
[High-DPI displays](../rendering/world-units-and-cameras.md#high-dpi-displays)).
Camera projections and UI layout read the render context's size every
frame, so they follow the resize.

:::caution
A value computed once from `RenderContext.width`/`height` or a camera's
view, such as a quad sized to fill the view or a shader uniform set to
the canvas resolution, isn't updated by a resize. Compute it in a system
that runs every frame instead.
:::

## Stopping a resize sync

Call `stop` on the returned object to stop resizing. Stopping a `Game`
doesn't stop its resize sync. Call `stop` when the container is removed
from the page:

```ts
resizeSync.stop();
```
