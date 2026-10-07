---
sidebar_position: 10
---

# Context loss

A browser can lose a page's WebGL context: when the GPU is reset, when
the device runs low on memory, or when too many pages hold contexts. Mobile
browsers do it more often than desktop ones. Every texture, program, render
target and vertex buffer on the GPU is lost with the context.

When the context is lost, [`RenderContext`](/Forge/docs/api/classes/RenderContext)
asks the browser to restore it, and the game keeps running. When the
context is restored, the render context recreates every GPU resource the
engine created. The next frame draws what it drew before the loss, without
reloading the page.

## While the context is lost

[`isContextLost`](/Forge/docs/api/classes/RenderContext#iscontextlost) is
`true` from the moment the context is lost until the engine has recreated
its resources after the browser restores it.

While it's `true`:

- Systems keep running, so the game keeps simulating. The render system,
  the post-processing systems and the terrain render system draw nothing.
- Creating a material, texture, render target or geometry, and resizing a
  render target or the canvas, work as usual. They record what to create,
  and the engine creates it when the context is restored.
- A material created while the context is lost has no program yet, so
  members of a struct uniform (`u_light.color`) can't be set on it until the
  context is restored. Every other declared uniform can be set.

## Reacting to a lost context

[`onContextLost`](/Forge/docs/api/classes/RenderContext#oncontextlost) is
raised when the context is lost, and
[`onContextRestored`](/Forge/docs/api/classes/RenderContext#oncontextrestored)
once the engine has recreated its resources and `isContextLost` is `false`
again. Both are [`ForgeEvent`](../events/index.md)s.

A game that loses its context because it uses too much GPU memory can
lower its graphics settings when the context is lost, for example by
lowering [`maxPixelRatio`](/Forge/docs/api/classes/RenderContext#maxpixelratio):

```ts
renderContext.onContextLost.registerListener(() => {
  renderContext.maxPixelRatio = Math.max(1, renderContext.pixelRatio - 1);
});
```

The new resolution applies to the canvas and every canvas-sized render
target when the context is restored.

## What is recreated

When the context is restored, the render context:

1. requests the extensions the engine uses again (`EXT_color_buffer_float`,
   for [HDR render targets](./hdr-rendering.md));
2. links every material's program again;
3. uploads every texture again, from the source it was last updated from;
4. recreates every render target, empty, at its current size and format;
5. uploads every geometry's vertex data again;
6. raises `onContextRestored`.

A render target comes back empty, and the next frame draws into it again.
A texture is re-uploaded from the image, canvas, `ImageData`, `ImageBitmap`
or video frame it was last updated from. It keeps a reference to that
source, not a copy:

- A texture made from a canvas is re-uploaded with whatever the canvas
  shows when the context is restored.
- A closed `ImageBitmap` or `VideoFrame` can't be re-uploaded. A texture
  made from one comes back empty until it's updated again, which a game
  does in its `onContextRestored` listener.

The render context holds every texture, render target and geometry until it
is disposed, together with the source each texture keeps, so dispose the
ones you stop using (see [Disposing a texture](./textures.md#disposing-a-texture)).

WebGL objects a game creates itself through `renderContext.gl` aren't
recreated. Recreate them in an `onContextRestored` listener.
