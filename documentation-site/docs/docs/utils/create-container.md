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

## Stopping a resize sync

Call `stop` on the returned object to stop resizing:

```ts
resizeSync.stop();
```
