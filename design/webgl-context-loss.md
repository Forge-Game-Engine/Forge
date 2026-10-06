# Design: Surviving a Lost WebGL Context

|                                       |                                                                                                                                                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                                                                   |
| **Kind**                              | Feature                                                                                                                                                                                                                                             |
| **Found in**                          | Galactic Journey demo: `src/graphics/recover-from-context-loss.ts` (saves a lower quality and reloads the page)                                                                                                                                     |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                            |
| **Related**                           | [`sprite-textures.md`](./sprite-textures.md) and [`shader-uniform-declarations.md`](./shader-uniform-declarations.md) (prerequisites), [`render-resolution.md`](./render-resolution.md), [`persistent-preferences.md`](./persistent-preferences.md) |

## 0. Targeted modules

| Path                                                                       | Change   | Notes                                                                                                                                                                |
| -------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/rendering/render-context.ts`                                          | Modified | Handles `webglcontextlost`/`restored`; `isContextLost`; events; the resource registry; re-requests extensions; owns the instance buffer and shared quad and textures |
| `src/rendering/materials/material.ts`, program cache                       | Modified | Programs relink; uniform locations are re-queried                                                                                                                    |
| `src/rendering/texture.ts`                                                 | Modified | Keeps its source so it can re-upload                                                                                                                                 |
| `src/rendering/render-target.ts`, `ping-pong-target.ts`                    | Modified | Take the render context; recreate their framebuffers and textures                                                                                                    |
| `src/rendering/geometry/*`, `src/rendering/terrain/create-terrain-mesh.ts` | Modified | `Geometry` is created from vertex data, which it keeps, instead of caller-made buffers                                                                               |
| `src/rendering/fullscreen-pass.ts`                                         | Modified | Its shared quad moves onto the render context                                                                                                                        |
| `documentation-site/docs/docs/rendering/`                                  | Modified | A context-loss section                                                                                                                                               |

---

## 1. Summary

Browsers take a page's WebGL context away when the GPU is reset, when
the device runs low on memory, or when too many pages hold contexts.
Mobile browsers do it more often, and a game that pushes resolution or
effects is the usual victim. The canvas raises `webglcontextlost`; unless
the page calls `preventDefault()` on it, the context never comes back.

Forge doesn't listen for it. Every GL object it created is gone. GL calls
on a lost context do nothing, by specification, but Forge's own checks
throw: shader compile and link checks, the render target's framebuffer
completeness check, and uniform lookups on a material created while the
context is gone. So the game stops. The demo handles the event itself by
saving a cheaper graphics quality and reloading the page, which loses the
player's run, and its comment notes it has to work outside the ECS
because "a lost context can stop the game loop altogether".

Web engines handle this: they stop drawing while the context is lost, ask
for it back, and rebuild their GPU resources when it returns. This design
does that for Forge, and tells the game when it happens so it can lower
its settings without a reload.

---

## 2. Scope

### In scope

- Asking for the context back and noticing when it returns.
- Not throwing while it's lost.
- Rebuilding programs, textures, render targets, geometry and the shared
  resources the render context owns on restore.
- `onContextLost`/`onContextRestored` events.

### Out of scope

- **Choosing lower settings after a loss.** That's the game's call (the
  demo steps its quality down). With
  [`render-resolution.md`](./render-resolution.md) it can lower
  `maxPixelRatio` in the event handler instead of reloading.
- **Raw GL objects created by game code.** After
  [`sprite-textures.md`](./sprite-textures.md) removes the raw GL helpers,
  a game has no reason to create them; if it does, it rebuilds them in
  `onContextRestored`.

---

## 3. How established engines handle this

- **Three.js**: `WebGLRenderer` calls `preventDefault()` on
  `webglcontextlost` and stops rendering. On `webglcontextrestored` it
  resets its internal state and rebuilds lazily: each texture, geometry
  and program is re-uploaded the next time it's used, from the data the
  engine keeps.
- **Babylon.js**: `onContextLostObservable` and
  `onContextRestoredObservable`; the engine eagerly rebuilds every
  texture, buffer and effect it tracks, keeping texture sources for that
  purpose. An engine-wide option (`doNotHandleContextLost`) turns this
  off to save memory.
- **PlayCanvas**: the graphics device handles loss and restoration the
  same way and raises `devicelost`/`devicerestored`.
- **Phaser** (3.80 and later): every GL object is a wrapper the renderer
  tracks, including program, uniform and attribute locations, and each
  wrapper can recreate itself; raw `WebGLProgram`s never leave the
  renderer.

Babylon, PlayCanvas and Phaser track resources in strong registries that
`dispose`/`destroy` removes them from. Native engines (Unity, Godot, Bevy)
have the equivalent problem as GPU device loss, and their web builds
mostly don't recover; web-first engines do.

---

## 4. Design

### 4.1 Prerequisites

For the engine to rebuild everything, everything has to be a Forge
wrapper that owns its handles and keeps what it was built from. Today
that's not true:

- [`sprite-textures.md`](./sprite-textures.md) makes textures `Texture`
  objects that keep their source, makes render targets expose `Texture`s,
  moves the program cache onto the render context, and deletes the public
  helpers that return bare handles (`createTextureFromImage`,
  `createEmptyTexture`, `createProgram`, the shared placeholder textures).
- [`shader-uniform-declarations.md`](./shader-uniform-declarations.md)
  lets a material created while the context is lost validate
  `setUniform` from the shader source rather than from the (missing)
  program.
- This design finishes the job: `Geometry` is created from vertex data,
  which it keeps, instead of buffers the caller made; `RenderTarget`,
  `PingPongTarget`, `Geometry` and the terrain mesh take the render
  context instead of `gl`; and the module-level caches keyed by the
  `WebGL2RenderingContext` (the full-screen pass's shared quad, the
  placeholder textures) move onto the render context. Those caches would
  otherwise hand out dead handles after a restore, since the
  `WebGL2RenderingContext` object itself survives.

### 4.2 Losing the context

The render context listens on its canvas. On `webglcontextlost` it calls
`preventDefault()` (so the browser may restore the context), sets
`isContextLost`, and raises `onContextLost`.

While the context is lost:

- Systems keep running. Draw calls are harmless no-ops, so draw systems
  don't need guards of their own (including game-side effect systems such
  as the demo's refraction pass).
- Creating a `Material`, `Texture`, `RenderTarget` or `Geometry`, or
  resizing a target, records the request for the restore and touches no
  GL. The checks that read GL state (compile and link status,
  framebuffer completeness) are skipped, since they'd report failures
  that aren't real.

### 4.3 Restoring it

Every GPU resource registers with its render context when created and is
removed from the registry by `dispose()`. Each can rebuild its GL objects
from what it keeps on the CPU side:

| Resource       | Kept for the rebuild                                         | After restore                                                     |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Program        | Shader sources                                               | Relinked; uniform and attribute locations re-queried              |
| `Material`     | Uniform values (samplers hold `Texture`s, read at bind time) | Re-uploaded on next bind                                          |
| `Texture`      | Its source (image, canvas, `ImageData`) and options          | Re-uploaded                                                       |
| `RenderTarget` | Size and format                                              | Framebuffer and textures recreated empty; next frame redraws them |
| `Geometry`     | Vertex data                                                  | Buffers and vertex arrays recreated                               |
| Render context | Its instance buffer, shared quad, white and black textures   | Recreated                                                         |

On `webglcontextrestored`, the render context:

1. Re-requests the extensions it uses (`EXT_color_buffer_float`, for HDR
   targets), since extensions are lost with the context.
2. Links the programs again.
3. Recreates textures, render targets and geometry.
4. Clears `isContextLost` and raises `onContextRestored`.

The next frame draws normally.

A texture keeps a reference to its source, not a copy: a canvas
re-uploads whatever it shows at restore time, and an `ImageBitmap` or
`VideoFrame` that has been closed can't be re-uploaded, so such a texture
comes back empty until the game updates it in `onContextRestored`.

### 4.4 Memory

Keeping each texture's source means images stay in memory after upload.
Forge's image cache keeps them anyway, so for loaded images this costs
nothing extra. A texture made from a canvas keeps the canvas.

---

## 5. Phases

### Phase 1: Loss and restore

| #   | Task                                                                                                                                               | Size |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `Geometry` from vertex data; `RenderTarget`, `PingPongTarget`, `Geometry` and the terrain mesh take the render context; module caches move onto it | M    |
| 1.2 | Event handling, `isContextLost`, `onContextLost`/`onContextRestored`                                                                               | S    |
| 1.3 | Creation and resizing deferred while lost; GL-state checks skipped while lost                                                                      | M    |
| 1.4 | Strong resource registry (`dispose` unregisters); rebuild in the order of §4.3, extensions first                                                   | M    |
| 1.5 | e2e: lose and restore with `WEBGL_lose_context` mid-scene; assert it draws again                                                                   | M    |
| 1.6 | Migrate callers of the changed signatures (`/src`, docs demos, e2e); guide section; changelog under `#### Added` and `#### Changed`                | M    |

**Definition of done:** a scene that loses its context with
`WEBGL_lose_context.loseContext()` and gets it back with
`restoreContext()` draws the same frame as before, with no errors and no
reload.

Depends on [`sprite-textures.md`](./sprite-textures.md) (Phase 1) and
[`shader-uniform-declarations.md`](./shader-uniform-declarations.md).

---

## 6. Decision log

### DL-1: Rebuild everything, rather than notify and let the game rebuild

**Options.** (a) The engine rebuilds every resource it created. (b) The
engine raises events and the game recreates its sprites and materials.

**Decision: (a).**

**Rationale.** Once every GPU resource is a Forge wrapper that keeps its
data (§4.1), Forge has what it needs. Under (b), every game would have to
re-run its whole asset setup, which in practice means reloading the page,
the workaround this replaces.

### DL-2: Rebuild eagerly, from a strong registry

**Options.** (a) Eagerly on restore, from a registry `dispose` removes
resources from (Babylon, PlayCanvas, Phaser). (b) Lazily on next use
(three.js). (c) A registry of weak references.

**Decision: (a).**

**Rationale.** (a) puts the cost in one place, right after the restore,
and matches Forge's explicit ownership (callers dispose what they create,
see [`sprite-textures.md`](./sprite-textures.md) DL-2). (b) needs a
generation check on every bind. (c) can't be iterated without
`WeakRef`/`FinalizationRegistry` and would keep alive-looking entries for
resources nobody disposed.

### DL-3: Keep simulating while lost

**Rationale.** Context loss usually lasts a moment. Pausing the game would
be a game decision (a game can pause in its `onContextLost` handler); not
drawing is the engine's, and the GL calls already do nothing.

---

## 7. Open questions

1. **Should keeping sources be optional** to save memory, as Babylon's
   engine-wide `doNotHandleContextLost` does? A game that would rather
   reload than hold its sources could turn restoration off.
   - (a) Not until it's needed (proposed). (b) An engine-wide option.

---

## 8. Testing considerations

- Unit: each resource rebuilds from its kept data against a fresh mocked
  context; creation and resizing while lost defer; checks that read GL
  state are skipped while lost; `dispose` unregisters; extensions are
  re-requested before HDR targets are rebuilt.
- e2e (§5 task 1.5): the relative measurement of a landmark before the
  loss and after the restore, per the pattern in `AGENTS.md`.

## 9. Documentation and demo follow-up

- `rendering/index.md` (or a new page): what happens on context loss,
  reacting to `onContextLost`, and textures made from closable sources.
- Demo: `recover-from-context-loss.ts` lowers the quality in
  `onContextLost` and stays on the page (lowering `maxPixelRatio` needs
  [`render-resolution.md`](./render-resolution.md)).
