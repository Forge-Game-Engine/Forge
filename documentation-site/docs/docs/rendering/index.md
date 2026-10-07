# Rendering

Forge's renderer is a WebGL2 renderer driven by the ECS.
[`RenderContext`](/Forge/docs/api/classes/RenderContext) owns the canvas and
the WebGL2 context. `createRenderEcsSystem` queries every camera entity (a
[`CameraEcsComponent`](/Forge/docs/api/interfaces/CameraEcsComponent)) and
draws the sprites and text whose `category` matches that camera's
`cullingMask`, sorted by `layer` and then by depth within a layer.
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
- [Cameras and world units](./world-units-and-cameras.md): how a camera maps
  world units to the screen, and how a texture's texels map to world units.
- [Materials](./material-uniforms.md): shader programs and the uniform
  values they draw with.
- [Render targets](./multipass-rendering.md): rendering a camera into an
  off-screen texture, and the post-processing effects built on it
  ([Gaussian blur](./gaussian-blur.md), [bloom](./bloom.md) and
  [HDR rendering](./hdr-rendering.md)).
