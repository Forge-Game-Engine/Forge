---
sidebar_position: 10
---

# Context loss

A browser can take a page's WebGL context away: when the GPU is reset, when
the device runs low on memory, or when too many pages hold contexts. Mobile
browsers do it more often than desktop ones. Every texture, program, render
target and vertex buffer on the GPU is lost with the context.

[`RenderContext`](/Forge/docs/api/classes/RenderContext) handles this
itself. It asks the browser to give the context back, keeps the game
running while it's gone, and rebuilds every GPU resource the engine created
when it returns. The next frame draws what it drew before the loss, without
reloading the page.

## While the context is lost

[`isContextLost`](/Forge/docs/api/classes/RenderContext#iscontextlost) is
`true` from the moment the browser takes the context until the engine has
rebuilt its resources after the browser restores it.

While it's `true`:

- Systems keep running, so the game keeps simulating. The render system,
  the post-processing systems and the terrain render system draw nothing.
- Creating a material, texture, render target or geometry, and resizing a
  render target or the canvas, work as usual. They record what to create,
  and the engine creates it when the context is restored.
- A material created while the context is lost has no program yet, so
  members of a struct uniform (`u_light.color`) can't be set on it until the
  context is restored. Every other declared uniform can be set.

The context usually comes back within a moment. A game that would rather
stop while it's gone pauses itself in its `onContextLost` listener.

## Reacting to a lost context

[`onContextLost`](/Forge/docs/api/classes/RenderContext#oncontextlost) is
raised when the browser takes the context away, and
[`onContextRestored`](/Forge/docs/api/classes/RenderContext#oncontextrestored)
once the engine has rebuilt everything and `isContextLost` is `false`
again. Both are [`ForgeEvent`](../events/custom-events.md)s.

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

## What is rebuilt

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
rebuilt. Recreate them in an `onContextRestored` listener.
