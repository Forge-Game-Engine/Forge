# Rendering

Forge's renderer is a WebGL2, sprite-batching renderer driven by the ECS.
[`RenderContext`](/Forge/docs/api/classes/RenderContext) owns the canvas and
WebGL2 context; `createRenderEcsSystem` queries every camera entity
(a [`CameraEcsComponent`](/Forge/docs/api/interfaces/CameraEcsComponent)) and
draws the sprites matching that camera's `cullingMask`, sorted by each
sprite's `layer` (draw order, lower first) and then by depth (world Y
position) within a layer, batching consecutive sprites that share a
[`Renderable`](/Forge/docs/api/classes/Renderable) into a single draw call.

This section is a work in progress and currently covers the multipass
rendering foundation and its first post-processing effect; a full guide to
sprites, materials, and cameras is planned separately.

Guides in this section:

- [Multipass Rendering](./multipass-rendering.md): rendering a camera into
  an off-screen texture and presenting it, the groundwork for future
  post-processing and lighting passes.
- [Gaussian Blur](./gaussian-blur.md): a two-pass separable blur
  post-processing effect built on top of multipass rendering.
- [Bloom](./bloom.md): an additive glow post-processing effect built on the
  same separable blur technique.
- [HDR Rendering & Tone Mapping](./hdr-rendering.md): opting a camera's
  render target into HDR storage and compressing it back to displayable
  range, so bloom can react to true HDR brightness (including emissive
  maps) instead of an 8-bit ceiling.
- [Nine-Slice Sprites](./nine-slice-sprites.md): slicing a sprite into a 3x3
  grid so its corners keep their size while its edges/center stretch or
  tile, for UI panels and buttons that resize without distorting.
