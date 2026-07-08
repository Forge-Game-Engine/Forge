# Rendering

Forge's renderer is a WebGL2, sprite-batching renderer driven by the ECS.
[`RenderContext`](/Forge/docs/api/classes/RenderContext) owns the canvas and
WebGL2 context; `createRenderEcsSystem` queries every camera entity
(a [`CameraEcsComponent`](/Forge/docs/api/interfaces/CameraEcsComponent)) and
draws the sprites matching that camera's `cullingMask`, sorted and batched by
shared [`Renderable`](/Forge/docs/api/classes/Renderable).

This section is a work in progress and currently covers the multipass
rendering foundation; a full guide to sprites, materials, and cameras is
planned separately.

Guides in this section:

- [Multipass Rendering](./multipass-rendering.md): rendering a camera into
  an off-screen texture and presenting it, the groundwork for future
  post-processing and lighting passes.
