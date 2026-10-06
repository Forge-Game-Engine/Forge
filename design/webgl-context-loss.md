# Design: Surviving a Lost WebGL Context

|                                       |                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                           |
| **Kind**                              | Feature                                                                                                     |
| **Found in**                          | Galactic Journey demo: `src/graphics/recover-from-context-loss.ts` (saves a lower quality and reloads the page) |
| **Engine version at time of writing** | `0.25.8`                                                                                                    |
| **Related**                           | [`sprite-textures.md`](./sprite-textures.md) (prerequisite), [`render-resolution.md`](./render-resolution.md), [`persistent-preferences.md`](./persistent-preferences.md) |

## 0. Targeted modules

| Path                                         | Change   | Notes                                                                                     |
| -------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `src/rendering/render-context.ts`            | Modified | Handles `webglcontextlost`/`restored`; `isContextLost`; events; rebuilds resources        |
| `src/rendering/materials/material.ts`        | Modified | Can relink its program                                                                    |
| `src/rendering/texture.ts`                   | Modified | Keeps its source so it can re-upload                                                      |
| `src/rendering/render-target.ts`, `geometry/` | Modified | Can recreate their GL objects                                                            |
| `src/rendering/systems/*`, `src/text/rendering/*` | Modified | Draw entry points do nothing while the context is lost                              |
| `documentation-site/docs/docs/rendering/`    | Modified | A context-loss section                                                                    |

---

## 1. Summary

Browsers take a page's WebGL context away when the GPU is reset, when
the device runs low on memory, or when too many pages hold contexts.
Mobile browsers do it more often, and a game that pushes resolution or
effects is the usual victim. The canvas raises `webglcontextlost`; unless
the page calls `preventDefault()` on it, the context never comes back.

Forge doesn't listen for it. Every GL object it created is gone, the next
attempt to create one fails, and the game stops. The demo handles the event
itself by saving a cheaper graphics quality and reloading the page, which
loses the player's run, and its comment notes it has to work outside the
ECS because "a lost context can stop the game loop altogether".

Web engines handle this: they stop drawing while the context is lost, ask
for it back, and rebuild their GPU resources when it returns. This design
does that for Forge, and tells the game when it happens so it can lower
its settings without a reload.

---

## 2. Scope

### In scope

- Asking for the context back and noticing when it returns.
- Not drawing, and not throwing, while it's lost.
- Rebuilding programs, textures, render targets and geometry on restore.
- `onContextLost`/`onContextRestored` events.

### Out of scope

- **Choosing lower settings after a loss.** That's the game's call (the
  demo steps its quality down). With
  [`render-resolution.md`](./render-resolution.md) it can lower
  `maxPixelRatio` in the event handler instead of reloading.
- **Raw GL objects created by game code.** After
  [`sprite-textures.md`](./sprite-textures.md) a game has no reason to
  create them; if it does, it rebuilds them in `onContextRestored`.

---

## 3. How established engines handle this

- **Three.js**: `WebGLRenderer` calls `preventDefault()` on
  `webglcontextlost`, stops rendering, and on `webglcontextrestored`
  re-initializes its state; textures and geometry re-upload from the data
  they keep.
- **Babylon.js**: `onContextLostObservable` and
  `onContextRestoredObservable`; the engine rebuilds every texture, buffer
  and effect it tracks, keeping texture sources for that purpose.
- **PlayCanvas**: the graphics device handles loss and restoration the
  same way and raises `devicelost`/`devicerestored`.

Native engines (Unity, Godot, Bevy) have the equivalent problem as GPU
device loss, and their web builds mostly don't recover; web-first engines
do.

---

## 4. Design

### 4.1 Losing the context

The render context listens on its canvas. On `webglcontextlost` it calls
`preventDefault()` (so the browser may restore the context), sets
`isContextLost`, and raises `onContextLost`.

While the context is lost:

- The render, present, post-processing and text systems return at the
  start of `update`. Everything else (logic, physics, audio, input) keeps
  running, so the game is where it should be when drawing resumes.
- Creating a `Material`, `Texture`, `RenderTarget` or `Geometry` records
  it for the restore and touches no GL.

### 4.2 Restoring it

Every GPU resource registers with its render context (weakly, so a
dropped resource is collected as usual) and can rebuild its GL objects
from what it keeps on the CPU side:

| Resource       | Kept for the rebuild                          | After restore                       |
| -------------- | --------------------------------------------- | ----------------------------------- |
| `Material`     | Shader sources (already in the shader cache), uniform values | Relinked; uniforms re-uploaded on next bind |
| `Texture`      | Its source (image, canvas, `ImageData`) and options | Re-uploaded                   |
| `RenderTarget` | Size and format                               | Recreated empty; next frame redraws it |
| `Geometry`     | Vertex and index data                         | Buffers and VAOs recreated          |

On `webglcontextrestored`, the render context rebuilds all of them,
clears `isContextLost`, and raises `onContextRestored`. The next frame
draws normally.

### 4.3 Memory

Keeping each texture's source means images stay in memory after upload.
Forge's image cache keeps them anyway, so for loaded images this costs
nothing extra. A texture made from a canvas keeps the canvas.

---

## 5. Phases

### Phase 1: Loss and restore

| #   | Task                                                                                      | Size |
| --- | ----------------------------------------------------------------------------------------- | ---- |
| 1.1 | Event handling, `isContextLost`, `onContextLost`/`onContextRestored`                      | S    |
| 1.2 | Draw systems return while lost; resource creation deferred while lost                     | M    |
| 1.3 | Resource registry and rebuild for materials, textures, render targets, geometry           | M    |
| 1.4 | Text atlases and the UI's targets restored through the same path                          | S    |
| 1.5 | e2e: lose and restore with `WEBGL_lose_context` mid-scene; assert it draws again          | M    |
| 1.6 | Guide section; changelog under `#### Added`                                               | S    |

**Definition of done:** a scene that loses its context with
`WEBGL_lose_context.loseContext()` and gets it back with
`restoreContext()` draws the same frame as before, with no errors and no
reload.

Depends on [`sprite-textures.md`](./sprite-textures.md) Phase 1: until
textures are Forge objects that keep their source, there's nothing to
re-upload from.

---

## 6. Decision log

### DL-1: Rebuild everything, rather than notify and let the game rebuild

**Options.** (a) The engine rebuilds every resource it created. (b) The
engine raises events and the game recreates its sprites and materials.

**Decision: (a).**

**Rationale.** Every resource is created through Forge's wrappers, so
Forge has what it needs. Under (b), every game would have to re-run its
whole asset setup, which in practice means reloading the page, the
workaround this replaces.

### DL-2: Keep simulating while lost

**Rationale.** Context loss usually lasts a moment. Pausing the game would
be a game decision (a game can pause in its `onContextLost` handler); not
drawing is the engine's.

---

## 7. Open questions

1. **Should textures be able to opt out of keeping their source** to save
   memory (Babylon's `doNotHandleContextLost`)? A texture from a large
   canvas, say.
   - (a) Not until it's needed (proposed). (b) A texture option.

---

## 8. Testing considerations

- Unit: each resource rebuilds from its kept data against a fresh mocked
  context; creation while lost defers; draw systems skip while lost.
- e2e (§5 task 1.5): the relative measurement of a landmark before the
  loss and after the restore, per the pattern in `AGENTS.md`.

## 9. Documentation and demo follow-up

- `rendering/index.md` (or a new page): what happens on context loss,
  and reacting to `onContextLost`.
- Demo: `recover-from-context-loss.ts` lowers the quality in
  `onContextLost` and stays on the page.
