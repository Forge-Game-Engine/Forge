# Rendering

Forge draws sprites and text with WebGL2, from ECS components.
[`RenderContext`](/Forge/docs/api/classes/RenderContext) holds the canvas
and its WebGL2 context. Each frame,
[`createRenderEcsSystem`](/Forge/docs/api/functions/createRenderEcsSystem)
draws, for every camera entity, the sprites and text whose `category`
matches the camera's `cullingMask`, in [draw order](./draw-order.md).

## Parts of the renderer

- [Textures](./textures.md): images on the GPU, created from images,
  canvases, pixel data or video frames, and sampled by sprites and
  materials.
- [Sprites](./sprites.md): the `SpriteEcsComponent`, which draws a texture
  at an entity's position, and [nine-slice sprites](./nine-slice-sprites.md),
  which resize without stretching their corners.
- [Draw order](./draw-order.md): which sprite or text is drawn on top where
  they overlap.
- [Cameras](./world-units-and-cameras.md): the `CameraEcsComponent`, which
  sets which part of the world is drawn to the canvas, and how world units
  map to screen pixels and texels.
- [Masks](./masks.md): clipping sprites and text to a rect, or revealing
  part of them from an edge or around a center.
- [Materials](./material-uniforms.md): shader programs and the uniform
  values they draw with.
- [Render targets](./multipass-rendering.md): drawing a camera into an
  off-screen texture, and the post-processing effects that process it
  ([Gaussian blur](./gaussian-blur.md), [bloom](./bloom.md) and
  [HDR rendering](./hdr-rendering.md)).

## Drawing a scene

[`createGame`](/Forge/docs/api/functions/createGame) creates the render
context. A scene needs a camera, an entity with a sprite, the transform
system and the render system:

```ts
import {
  addPositionComponent,
  createTransformEcsSystem,
} from '@forge-game-engine/forge/common';
import {
  addSpriteComponent,
  createCamera,
  createRenderEcsSystem,
} from '@forge-game-engine/forge/rendering';
import { createGame } from '@forge-game-engine/forge/utilities';

const { game, world, renderContext } = createGame('game-container');

createCamera(world);

const entity = world.createEntity();

addPositionComponent(world, entity);
addSpriteComponent(world, entity, {
  texture: renderContext.whiteTexture,
  width: 1,
  height: 1,
});

world.addSystem(createTransformEcsSystem());
world.addSystem(createRenderEcsSystem(renderContext));

game.run();
```

The transform system runs first and writes each entity's world position,
rotation and scale, which the render system reads (see
[Transforms](../common/transforms.md)). The render system clears the canvas
and draws the white square at the center of the camera's view.
