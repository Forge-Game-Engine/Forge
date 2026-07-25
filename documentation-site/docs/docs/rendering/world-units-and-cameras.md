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
or PPU) is derived, not configured directly: it's recomputed every frame
from the camera's `verticalWorldUnits` and the current render destination's
height, via
[`calculatePixelsPerUnit`](/Forge/docs/api/functions/calculatePixelsPerUnit):

```
pixelsPerUnit = canvasHeight / verticalWorldUnits
```

For example, a camera with `verticalWorldUnits: 10` rendering to a 1080px-tall
canvas gets `1080 / 10 = 108` pixels per unit; the same camera rendering to a
540px-tall canvas gets `54` pixels per unit, half as many, so the same 10
world units still fill the whole vertical extent of a shorter canvas. This
is why resizing the window doesn't need any manual handling: on the next
frame, `RenderContext.height` reflects the new size and the projection
matrix's scale updates with it, whether the render system is drawing sprites
or `createTerrainRenderEcsSystem` is drawing terrain geometry.

[`SpriteEcsComponent.width`/`height`](/Forge/docs/api/interfaces/SpriteEcsComponent)
and physics shape sizes are authored in world units, not pixels; they don't
need to know about PPU at all, only the projection step (and the coordinate
conversions below) do.

## Converting screen and world positions manually

Mouse input and other screen-space coordinates need to go through the same
PPU as whatever's on screen, or they'll be off by the camera's scale factor.
[`screenToWorldSpace`](/Forge/docs/api/functions/screenToWorldSpace) and
[`worldToScreenSpace`](/Forge/docs/api/functions/worldToScreenSpace) both
take an optional trailing `pixelsPerUnit` argument for this; pass the same
value the camera used to render (typically
`calculatePixelsPerUnit(renderContext.height, camera.verticalWorldUnits)`),
or omit it only if that camera's `verticalWorldUnits` genuinely produces a
PPU of `1` for your current canvas size.
