---
sidebar_position: 3
---

# Cameras and World Units

A camera is an entity with a
[`CameraEcsComponent`](/Forge/docs/api/interfaces/CameraEcsComponent) and a
position. Each frame, the render system draws the area of the world around
the camera's position onto the canvas, or into the camera's
[render target](./multipass-rendering.md). Positions and sizes in the world
are in world units, and the camera sets how many world units fit on the
screen.

## Creating a camera

[`createCamera`](/Forge/docs/api/functions/createCamera) creates an entity
with a position and a camera component:

```ts
import { createCamera } from '@forge-game-engine/forge/rendering';

const camera = createCamera(world, { verticalWorldUnits: 20 });
```

[`addCameraComponent`](/Forge/docs/api/functions/addCameraComponent) adds
a camera component to an entity that already has a position.

## World units

A camera's `verticalWorldUnits` is the height of the world, in world units,
that the camera shows, on a canvas of any size or shape. It defaults to
`10`. The width the camera shows follows from the canvas's aspect ratio.

The camera above shows 20 world units vertically on a 600 pixel tall canvas
and on a 1200 pixel tall one, so an entity keeps its place and size relative
to the screen when the canvas is resized. A sprite's `width` and `height`,
physics shapes and positions are all in world units.

The number of CSS pixels one world unit covers on screen follows from
`verticalWorldUnits`, the camera's `zoom` and the canvas's height:

```
pixelsPerUnit = canvasHeight * zoom / verticalWorldUnits
```

A camera with `verticalWorldUnits: 10` gets 108 pixels per unit on a
1080 pixel tall canvas, and 54 on a 540 pixel tall one. The render system
computes this every frame, so it follows the canvas when it's resized.

## Importing textures at a fixed PPU

A texture's size is in texels, and a sprite's size is in world units. A
texture's pixels per unit (PPU) is how many texels span one world unit.
[`importTexture`](/Forge/docs/api/functions/importTexture) converts a
texture's size to world units at a given `pixelsPerUnit`:

```ts
import {
  createTexture,
  importTexture,
} from '@forge-game-engine/forge/rendering';

const texture = createTexture(renderContext, image);

const { worldWidth, worldHeight } = importTexture(texture, {
  pixelsPerUnit: 32,
});
```

[`createImageSprite`](/Forge/docs/api/functions/createImageSprite) sizes a
sprite the same way, from its `pixelsPerUnit` option:

```ts
const spriteOptions = createImageSprite(texture, { pixelsPerUnit: 32 });
```

With `pixelsPerUnit: 32`, a 64x64 texel image becomes a 2x2 world unit
sprite and a 32x64 texel image becomes 1x2 world units, so art drawn at the
same pixel density keeps its relative size. `pixelsPerUnit` defaults to
`100`. Pass `1` to size a sprite at one world unit per texel.

A texture's `pixelsPerUnit` converts texels to world units once, when the
sprite is created. A camera's `pixelsPerUnit` converts world units to screen
pixels, and changes with the camera's zoom and the canvas's size.

## Setting the background color

A camera's `clearColor` is the color its destination (the canvas or its
render target) is cleared to before anything is drawn. Each destination is
cleared once per frame, by the first camera that draws into it:

```ts
import { Color, createCamera } from '@forge-game-engine/forge/rendering';

createCamera(world, { clearColor: Color.black });
```

`clearColor` defaults to `Color.transparent`. Setting
[`renderContext.clearStrategy`](/Forge/docs/api/classes/RenderContext#clearstrategy)
to `'none'` stops the render context clearing anything, so each frame is
drawn over the last.

## Moving and zooming a camera

A camera shows the area centered on its `position.world`, and its `zoom`
divides the height it shows: a `zoom` of `2` shows half of
`verticalWorldUnits`. Move a camera by writing its `position.local`, and
zoom it by writing `zoom`:

```ts
import { positionId } from '@forge-game-engine/forge/common';
import { cameraId } from '@forge-game-engine/forge/rendering';

const position = world.getComponent(camera, positionId)!;
const cameraComponent = world.getComponent(camera, cameraId)!;

position.local.x = 5;
cameraComponent.zoom = 2;
```

A camera parented to another entity follows it (see
[Transforms](../common/transforms.md)).

[`createCameraEcsSystem`](/Forge/docs/api/functions/createCameraEcsSystem)
moves and zooms cameras from input actions. Give a camera a `panInput`
(an `Axis2dAction`) and a `zoomInput` (an `Axis1dAction`), and register
the system before the transform system:

```ts
import { createCameraEcsSystem } from '@forge-game-engine/forge/rendering';

createCamera(world, { panInput: panAction, zoomInput: zoomAction });

world.addSystem(createCameraEcsSystem(time));
```

The system changes `zoom` within `minZoom` and `maxZoom`, and moves the
camera's `position.local`. It skips cameras with `isStatic` set.
[Actions and Input Groups](../input/actions.md) covers creating and binding
the actions.

## What a camera sees

[`getCameraView`](/Forge/docs/api/functions/getCameraView) returns a camera
entity's [`CameraView`](/Forge/docs/api/interfaces/CameraView): the world
area it shows (`bounds` and `size`), its `pixelsPerUnit`, and conversions
between world positions and viewport positions. A viewport position is in
CSS pixels from the canvas's top-left corner, with Y pointing down, the
same space as
[`MouseInputSource.position`](/Forge/docs/api/classes/MouseInputSource).

```ts
import { getCameraView } from '@forge-game-engine/forge/rendering';

const view = getCameraView(world, camera, renderContext);
```

The view is `verticalWorldUnits / zoom` world units tall, as wide as the
canvas's aspect ratio makes it, and centered on the camera's
`position.world`. A camera with a render target gets the same view.

`getCameraView` computes the view from the camera's components when it's
called. A system that runs before the transform system gets the camera's
position from the previous frame. A system that already has the camera's
components can call
[`computeCameraView`](/Forge/docs/api/functions/computeCameraView) with
them instead.

### Sizing and positioning relative to the view

Code that needs the visible area of the world, for example to cover the
view with a background, spawn entities across it or keep an entity on
screen, reads the view's `bounds` and `size`:

```ts
const { bounds, size } = getCameraView(world, camera, renderContext);

// Above the top edge, anywhere across the visible width.
const spawnPosition = {
  x: bounds.min.x + Math.random() * size.x,
  y: bounds.max.y + 1,
};
```

`bounds` includes the camera's position and zoom. The canvas's aspect ratio
changes when it's resized, so get the view each time it's used rather than
once at startup.

### Converting between the viewport and the world

`viewportToWorld` converts a viewport position, such as a pointer position,
to a world position. `worldToViewport` converts a world position to a
viewport position, for example to place a DOM element over an entity:

```ts
const view = getCameraView(world, camera, renderContext);

const pointerWorldPosition = view.viewportToWorld(mouseInputSource.position);
const entityViewportPosition = view.worldToViewport(position.world);
```

Both return new vectors and don't change their argument.

### Converting between cameras

Cameras that draw onto the same canvas share the viewport. To convert a
position from one camera's world to another's, convert it to the viewport
with the first camera's view and back with the second's:

```ts
const worldView = getCameraView(world, worldCamera, renderContext);
const overlayView = getCameraView(world, overlayCamera, renderContext);

const overlayPosition = overlayView.viewportToWorld(
  worldView.worldToViewport(position.world),
);
```

The result is correct for any position and zoom of either camera.

## Culling sprites outside the view

The render system doesn't draw a sprite, nine-slice region or text glyph
whose quad is entirely outside a camera's view, and uploads nothing to the
GPU for it. Sprites outside the view don't need to be disabled.

The test uses the quad the sprite vertex shader draws: the sprite's
`width` and `height` around its `pivot`, scaled, flipped and rotated by the
entity's world transform. Text outlines and shadows are drawn inside their
glyph quads, so they're culled with their glyphs. Terrain meshes are always
drawn.

## High-DPI displays

On a display scaled above 100%, or a zoomed page, one CSS pixel covers
several device pixels. A `RenderContext` sets its canvas's drawing buffer
to the canvas's size in CSS pixels times `window.devicePixelRatio`, so it
renders at the display's resolution. `createGame` keeps both sizes up to
date as the canvas's container is resized (see
[Resizing with the container](../utils/create-container.md#resizing-with-the-container)).

A `RenderContext` therefore has two sizes:

| Property                 | Unit                                   | Use it for                                                                                                          |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `width` / `height`       | Device pixels (the drawing buffer)     | Anything GL draws into: the WebGL viewport, a shader uniform compared against `gl_FragCoord`, a canvas-sized target |
| `cssWidth` / `cssHeight` | CSS pixels (the canvas's on-page size) | Anything the DOM measures: `MouseInputSource.position`, `getSafeAreaInsets()`, element sizes                        |

`pixelRatio` is the ratio between them. A camera view's `pixelsPerUnit` and
viewport positions are in CSS pixels. Only `RenderContext.resize` changes
these five properties.

Rendering cost grows with the square of the pixel ratio. `maxPixelRatio`
caps it:

```ts
import { createGame } from '@forge-game-engine/forge/utilities';

const { renderContext } = createGame('game-container', {
  renderContext: { maxPixelRatio: 2 },
});
```

Setting `renderContext.maxPixelRatio` while the game runs, for example from
a graphics quality setting, resizes the canvas and every canvas-sized
render target to the new resolution from the next frame. `maxPixelRatio: 1`
renders at CSS resolution.
