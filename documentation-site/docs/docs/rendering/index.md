# Rendering

Forge's renderer is a WebGL2 renderer driven by the ECS.
[`RenderContext`](/Forge/docs/api/classes/RenderContext) owns the canvas and
the WebGL2 context. `createRenderEcsSystem` queries every camera entity (a
[`CameraEcsComponent`](/Forge/docs/api/interfaces/CameraEcsComponent)) and
draws the sprites and text whose `category` matches that camera's
`cullingMask`, in [draw order](./draw-order.md): by `layer`, then by
[`DrawOrderEcsComponent`](/Forge/docs/api/interfaces/DrawOrderEcsComponent),
then in hierarchy order.
Consecutive sprites with the same material, texture and emissive map are
drawn in one instanced draw call.

Rendering is made of these parts:

- [Textures](./textures.md): images on the GPU, created from images,
  canvases, pixel data or video frames, and sampled by sprites and
  materials.
- [Sprites](./sprites.md): the `SpriteEcsComponent` that draws a texture at
  an entity's position, with its draw order, camera category, emissive map
  and material, and [nine-slice sprites](./nine-slice-sprites.md) that
  resize without stretching their corners.
- [Draw order](./draw-order.md): which sprite or text is drawn on top
  where they overlap, drawing a child relative to its parent, and sorting
  by height on screen for top-down views.
- [Masks](./masks.md): clipping sprites and text to a rect, or revealing
  part of them from an edge or around a center, for scroll views, filling
  bars and draining rings.
- [Cameras and world units](./world-units-and-cameras.md): how a camera maps
  world units to the screen, and how a texture's texels map to world units.
- [Materials](./material-uniforms.md): shader programs and the uniform
  values they draw with.
- [Render targets](./multipass-rendering.md): rendering a camera into an
  off-screen texture, and the post-processing effects built on it
  ([Gaussian blur](./gaussian-blur.md), [bloom](./bloom.md) and
  [HDR rendering](./hdr-rendering.md)).
