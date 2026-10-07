---
sidebar_position: 1
---

# World Units and Cameras

Game logic that positions or sizes things based on `renderContext.canvas.width`/
`canvas.height` (a fraction of the canvas, half its width, and so on) looks
right on the resolution it was tuned against and drifts on every other
resolution or aspect ratio: a player ship centered on one screen ends up
off-center on another, and a fountain sized at "12% of canvas height" grows
or shrinks with the browser window instead of staying a fixed size in the
game world. This ad-hoc canvas-pixel-fraction math is fragile because it
mixes two things that should be independent: how big something is in the
world, and how many pixels the screen happens to have.

Every [`CameraEcsComponent`](/Forge/docs/api/interfaces/CameraEcsComponent)
fixes this with `verticalWorldUnits`: the total height, in world units, that
camera always shows vertically, regardless of the destination's resolution
or aspect ratio. Horizontal extent then follows automatically from the
destination's width-to-height ratio, the same way Unity's orthographic
camera size works.

```ts
import { createCamera } from '@forge-game-engine/forge/rendering';

const cameraEntity = createCamera(world, {
  verticalWorldUnits: 20,
});
```

With `verticalWorldUnits: 20`, this camera always shows 20 world units of
vertical space, whether the canvas is 600px or 1200px tall, a phone in
portrait or a widescreen monitor. A sprite positioned near the top of the
world sits at roughly the same relative spot on every screen, instead of
sliding off-screen on a narrower or shorter canvas.

## The default

`verticalWorldUnits` defaults to `10`, mirroring Unity's own default
orthographic camera size of `5` (Unity's size is a half-height, so `5 * 2`
is the equivalent full height). This is a deliberate, resolution-independent
unit count, not a value chosen to match any particular pixel resolution:
content authored assuming 1 world unit equals 1 pixel (the engine's previous
behavior) will render at a different scale under the new default and needs
its sprite sizes and physics shapes re-tuned in world-unit terms.

## Pixels per unit

The number of screen pixels one world unit occupies (its "pixels per unit",
or PPU) is derived, not configured directly. It follows from the camera's
`verticalWorldUnits`, its `zoom` and the canvas's current height:

```
pixelsPerUnit = canvasHeight * zoom / verticalWorldUnits
```

For example, a camera with `verticalWorldUnits: 10` on a 1080px-tall canvas
gets `1080 / 10 = 108` pixels per unit; the same camera on a 540px-tall
canvas gets `54`, half as many, so the same 10 world units still fill the
canvas vertically. Resizing the window needs no handling of your own: the
render system and `createTerrainRenderEcsSystem` recompute every camera's
projection each frame.

[`SpriteEcsComponent.width`/`height`](/Forge/docs/api/interfaces/SpriteEcsComponent)
and physics shape sizes are authored in world units, not pixels; they don't
need to know about PPU at all, only the projection step (and the coordinate
conversions below) do.

## Importing textures at a fixed PPU

Sizing a sprite directly from its texture's pixel dimensions means every
piece of art needs its sprite size hand-tuned in world-unit terms, and two
textures authored at different pixel densities (say, 32px-per-tile terrain
art next to a 128px-per-tile character) end up the wrong size relative to
each other unless every call site remembers to compensate.

[`importTexture`](/Forge/docs/api/functions/importTexture) fixes this the
way an art pipeline's per-texture import settings would: give it a
`pixelsPerUnit` and it converts a texture's pixel size into a world-unit
size once, consistently, regardless of how many pixels the source art
happens to have:

```ts
import { importTexture } from '@forge-game-engine/forge/rendering';

const { worldWidth, worldHeight } = importTexture(playerImage, {
  pixelsPerUnit: 32,
});
```

[`createImageSprite`](/Forge/docs/api/functions/createImageSprite) runs its
sprite's pixel dimensions (`frameDimensions`, or the full image) through
this same pipeline, sized via its own `pixelsPerUnit` option:

```ts
const playerSprite = createImageSprite(playerImage, renderContext, {
  pixelsPerUnit: 32,
});
```

With `pixelsPerUnit: 32`, a 64x64px image becomes a 2x2 world-unit sprite;
a 32x64px image from the same art set becomes 1x2 world units, keeping the
two proportional without any manual re-tuning. `pixelsPerUnit` defaults to
`100` on both `importTexture` and `createImageSprite`; pass `1` to size a
sprite directly from its pixel dimensions instead, treating each pixel as
one world unit.

This texture-import `pixelsPerUnit` is a different value from the
camera-derived one described above: this one is a fixed, per-texture
authoring choice applied once when a sprite is created; the camera's is
recomputed every frame from `verticalWorldUnits` and the render
destination's current height, and converts world units to _screen_ pixels
at render time rather than texture pixels to world units at import time.

## High-DPI displays

On a display scaled above 100% (most laptops, every HiDPI/Retina screen) or
a browser-zoomed page, one CSS pixel is several physical pixels. A
`RenderContext` sizes its canvas's drawing buffer to match: the canvas keeps
its on-page size in CSS pixels, but renders at that size times
`window.devicePixelRatio`, so sprites and text come out at the display's
native resolution instead of being upscaled (and blurred) by the browser.
`createContainerResizeSync` (wired up by `createGame`) keeps both in sync as
the container resizes or the pixel ratio changes.

That gives a `RenderContext` two sizes:

| Property                 | Unit                                   | Use it for                                                                                                                                               |
| ------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `width` / `height`       | Device pixels (the drawing buffer)     | Anything rendered into and then shown on the canvas: a shader uniform compared against `gl_FragCoord`, the WebGL viewport, a canvas-sized `RenderTarget` |
| `cssWidth` / `cssHeight` | CSS pixels (the canvas's on-page size) | Anything measured by the DOM: `MouseInputSource.position`, `getSafeAreaInsets()`, element sizes                                                          |

`pixelRatio` is the ratio between the two. A camera's view (see
[What a camera sees](#what-a-camera-sees)) measures its viewport and its
`pixelsPerUnit` in CSS pixels, so it pairs with pointer positions directly.

Rendering cost grows with the square of the pixel ratio, so a 3x phone
display draws nine times as many pixels as a 1x one. A fill-rate-heavy game
can cap it with `maxPixelRatio`:

```ts
const renderContext = createRenderContext(canvas, { maxPixelRatio: 2 });
```

If you set up with `createGame`, pass the same options through its
`renderContext` option:

```ts
const { renderContext } = createGame('game-container', {
  renderContext: { maxPixelRatio: 1.5 },
});
```

Pass `maxPixelRatio: 1` to always render at CSS resolution.

`maxPixelRatio` can also be changed at runtime, for example from a graphics
quality setting:

```ts
renderContext.maxPixelRatio = 1;
```

The render context re-applies its last resize at the new cap, so the canvas
and every canvas-sized render target (see
[Render target sizes](./multipass-rendering.md#render-target-sizes)) render
at the new resolution from the next frame. While the canvas has no size,
for example while its container is hidden, the cap is stored and applies on
the next resize.

`width`, `height`, `cssWidth`, `cssHeight` and `pixelRatio` are read-only.
Only `RenderContext.resize` changes them.

## What a camera sees

[`getCameraView`](/Forge/docs/api/functions/getCameraView) returns a camera
entity's [`CameraView`](/Forge/docs/api/interfaces/CameraView): the world
area it shows (`bounds` and `size`), its `pixelsPerUnit`, and conversions
between world positions and viewport positions. A viewport position is in
CSS pixels from the canvas's top-left corner, Y-down, the same space
`MouseInputSource.position` and other DOM measurements use.

The view is `verticalWorldUnits / zoom` world units tall, as wide as the
canvas's aspect ratio makes it, and centered on the camera's
`position.world`. A camera that renders into a `RenderTarget` gets the same
view, since the target is presented over the whole canvas.

```ts
import {
  createCamera,
  getCameraView,
} from '@forge-game-engine/forge/rendering';

const camera = createCamera(world, { verticalWorldUnits: 20 });

const view = getCameraView(world, camera, renderContext);
```

The view is computed when you ask for it, from the camera's components at
that moment, so it's never stale and there's nothing to keep in sync. It
does reflect the order systems run in: a system registered before
`createTransformEcsSystem` sees the camera where it was last frame, and a
UI canvas's camera has its `verticalWorldUnits` written by
`createUiLayoutEcsSystem`. A system that already holds the camera's
components can call
[`computeCameraView`](/Forge/docs/api/functions/computeCameraView) with
them instead of looking the entity up.

### Sizing and positioning things relative to what's visible

Game logic that needs to know how much world is on screen, to keep a
background covering the full view, spawn things across the visible width,
or clamp movement to the screen's edges, should read the view rather than
`RenderContext.width`/`height` (raw pixels):

```ts
const { bounds, size } = getCameraView(world, camera, renderContext);

// Spawn just above the top edge, anywhere across the visible width.
const spawnPosition = {
  x: bounds.min.x + Math.random() * size.x,
  y: bounds.max.y + 1,
};
```

`bounds` already accounts for where the camera is and how far it's zoomed,
so it stays right for a camera that moves or zooms. Compute it where you
use it rather than once at startup: the canvas's aspect ratio changes with
the window, and a value saved at startup goes stale.

### Converting between the viewport and the world

Pointer input arrives as a viewport position. Convert it with
`viewportToWorld`, and place DOM elements or check whether something is on
screen with `worldToViewport`:

```ts
const view = getCameraView(world, camera, renderContext);

const pointerWorldPosition = view.viewportToWorld(mouseInputSource.position);
const enemyOnCanvas = view.worldToViewport(enemyPosition.world);
```

Both return new vectors, so they're safe to call on an entity's live
position.

### Converting between cameras

Two cameras that draw onto the same canvas, such as a game camera and a HUD
camera with its own units, share the viewport. To put a HUD element over a
world entity, go through it:

```ts
const gameView = getCameraView(world, gameCamera, renderContext);
const hudView = getCameraView(world, hudCamera, renderContext);

const hudPosition = hudView.viewportToWorld(
  gameView.worldToViewport(shipPosition.world),
);
```

This stays right whichever camera moves or zooms. Deriving a fixed
"HUD units per world unit" constant from the two cameras' settings breaks as
soon as either one does.

## Off-screen sprites aren't drawn

The render system skips every sprite, nine-slice region and text glyph whose
quad lies entirely outside a camera's view, before uploading anything to
the GPU. A game with a large world doesn't need to disable sprites while
they're off screen to save rendering time; leave them enabled and let the
camera skip them.

The test uses the quad the sprite shader draws: the sprite's
`width`/`height` around its `pivot`, scaled, flipped and rotated by the
entity's world transform. A custom vertex shader that moves vertices outside
that quad can be skipped while part of it would still be on screen. Text
outlines and shadows are drawn inside their glyph quads, so they never are.
Terrain meshes are always drawn.
