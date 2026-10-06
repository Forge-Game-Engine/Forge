# Design: Post-Processing Passes Without Copy-Back

|                                       |                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                      |
| **Kind**                              | Feature and defect                                                                                                                     |
| **Found in**                          | Galactic Journey demo: `src/shockwave/refraction.system.ts`, `src/glitch/glitch.system.ts`, `src/graphics/graphics-quality.system.ts`  |
| **Engine version at time of writing** | `0.25.8`                                                                                                                               |
| **Related**                           | [`render-resolution.md`](./render-resolution.md), [`camera-views.md`](./camera-views.md), [`sprite-textures.md`](./sprite-textures.md) |

## 0. Targeted modules

| Path                                                             | Change   | Notes                                                                                                 |
| ---------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `src/rendering/render-target.ts`                                 | Modified | A second color buffer and framebuffer, allocated on first use, that post-processing passes write into |
| `src/rendering/fullscreen-pass.ts`                               | Modified | `beginPostProcessPass`: binds the other buffer, swaps, returns the texture to read                    |
| `src/rendering/systems/{bloom,gaussian-blur,tone-map}-system.ts` | Modified | Use it; their scratch full-resolution targets and copy-back passes are deleted                        |
| `src/rendering/systems/bloom-system.ts`                          | Modified | `passes: 0` skips the effect, as it does for the blur (a behavior change)                             |
| `documentation-site/docs/docs/rendering/*.md`                    | Modified | Writing a custom effect; pass counts                                                                  |

---

## 1. Summary

A full-screen pass can't read and write the same texture. Forge's bloom,
blur and tone-mapping systems each deal with that the same way: draw the
effect into a full-resolution scratch target, then draw a copy of the
scratch target back into the camera's target (the blur only when its
`intensity` is below `1`; at `1` its last pass already writes the camera
target). Each copy costs an extra full-screen draw, and each system keeps
its own map of scratch targets, checks their size every frame, and
disposes them on cleanup.

The demo's two custom effects (the shockwave's refraction and the hit
glitch) copy that code: a scratch target per camera target, a size check, a
copy material, the copy-back draw, and cleanup. Its comments point at the
tone-mapping system as the model. A game writing a screen effect has to
re-derive the engine's internal plumbing to do it.

A smaller inconsistency sits next to it: the blur does nothing at
`passes: 0`, but bloom at `passes: 0` still extracts the highlights and
composites them unblurred at a quarter resolution, so the demo's
graphics-quality setting turns bloom off with `intensity: 0` and keeps
the real intensity elsewhere to restore it.

Every engine's post-processing stack solves the first problem the same
way: the camera's color target is double-buffered, and each pass reads one
buffer and writes the other, with no copy back.

---

## 2. Scope

### In scope

- Double-buffered camera targets for post-processing.
- `beginPostProcessPass` for built-in and custom effects.
- Bloom skipping at `passes: 0`.

### Out of scope

- **Shared per-view uniforms** (resolution, view bounds, time) bound to
  every effect material automatically. An effect calls
  [`getCameraView`](./camera-views.md) and sets what it needs.
- **An effect stack object or volume system** (Unity's Volume framework).
  Effects stay components on the camera, ordered by system registration.
- **Effects that need their own intermediate resolutions** (bloom's
  downsampled chain, the blur's averaged copy). Those keep their own
  targets, sized from the target they process, as today.
- **Moving the effects out of Forge.** Bloom, blur and tone mapping are
  expected to move to their own package. The engine's share of this
  design is the part every effect needs, built in, extracted or a game's
  own: the second buffer on `RenderTarget` and `beginPostProcessPass`.
  The effects only call exported API (`beginPostProcessPass`,
  `drawFullscreenQuad`, `Material`, `createRenderTarget`,
  `PingPongTarget`), so tasks 1.3 and 1.4 move with them, and nothing here
  makes the move harder.

---

## 3. How established engines handle this

- **Bevy**: `ViewTarget::post_process_write()` returns a `source` (the
  current main texture) and a `destination` (the other of two), and flips
  which one is "main". Every post-process node calls it; nothing copies
  back, and the caller must write the whole destination. Custom effects
  use the same call. The camera's output target stays a stable texture;
  the two buffers are internal.
- **Unity URP**: renderer features blit from the camera color target into
  a temporary target (`Blitter`); with Unity 6's render graph, a pass
  writes a new texture and points the camera's color at it, instead of
  copying back.
- **Godot**: the compositor gives effects the scene buffers; built-in
  effects alternate between internal buffers.

---

## 4. Design

### 4.1 Double-buffered targets

A `RenderTarget` gets a second color texture, and a second framebuffer
with it attached, the first time a post-processing pass runs on it, the
same size and format. The target's current buffer is a texture and its
framebuffer together: binding the target binds the current framebuffer,
so sprites drawn into the target next frame land in the buffer the
present pass shows. Both buffers are resized inside `RenderTarget.resize`,
so the second one follows whichever size the target has.

### 4.2 `beginPostProcessPass`

```ts
/**
 * Binds `target`'s other color buffer for a full-screen pass (cleared,
 * blending off), makes it `target`'s current color, and returns the
 * previous color texture for the pass to read.
 */
function beginPostProcessPass(
  renderContext: RenderContext,
  target: RenderTarget,
): WebGLTexture;
```

A custom effect becomes:

```ts
const source = beginPostProcessPass(renderContext, camera.renderTarget);

refractionMaterial.setUniform('u_texture', source);
drawFullscreenQuad(renderContext, refractionMaterial);
```

Swapping at the start, before the draw, is safe because nothing reads
`colorTexture` between the call and the draw. As in Bevy, the pass must
write the whole destination: it's cleared when the pass begins, and
whatever the pass leaves unwritten is lost. (With
[`sprite-textures.md`](./sprite-textures.md), it returns a `Texture`.)

`colorTexture` is the target's stable handle for anything that samples it
later (a render-to-texture sprite, a minimap). With
[`sprite-textures.md`](./sprite-textures.md) it's a `Texture` whose GL
texture follows the current buffer, so a material holding it always
samples the latest frame. Until then, it's a raw `WebGLTexture` that
changes when buffers swap, so consumers read it when they draw rather than
once at setup, as the present system already does.

### 4.3 Built-in effects

- **Tone mapping**: one `beginPostProcessPass` and draw; its scratch
  target and copy are deleted.
- **Gaussian blur**: its final blend writes through `beginPostProcessPass`
  instead of a blend target plus copy-back.
- **Bloom**: the composite writes through it; the full-resolution
  composite target and copy-back are deleted. The downsampled bright-pass
  and blur targets stay.

Each saves one full-screen draw per frame and a full-resolution target.

### 4.4 Skipping

An effect whose settings can't change the image does no work: the blur at
`passes: 0`, and bloom at `intensity: 0`. Bloom at `passes: 0` changes
too: today it composites its unblurred, downsampled highlights, and it
will do nothing instead, to match the blur. That's a behavior change, and
the changelog says so. Removing the effect's component also turns it off,
which is how tone mapping (which has no neutral setting) is toggled.

---

## 5. Phases

### Phase 1: Post-process passes

| #   | Task                                                                                                                    | Size |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | Second color buffer and framebuffer on `RenderTarget`, allocated lazily, swapped together, resized and disposed with it | S    |
| 1.2 | `beginPostProcessPass`; tests that it swaps and returns the previous texture                                            | S    |
| 1.3 | Tone map, blur and bloom use it; scratch targets and copy-backs deleted                                                 | M    |
| 1.4 | Bloom skips at `passes: 0`                                                                                              | S    |
| 1.5 | Guide section "Writing a post-processing effect"; changelog under `#### Changed`                                        | S    |

**Definition of done:** no built-in effect copies back into the camera's
target; a custom effect needs only `beginPostProcessPass` and a material;
the bloom and translucent-UI e2e specs pass unchanged.

---

## 6. Decision log

### DL-1: Swap on begin, like Bevy

**Options.** (a) `beginPostProcessPass` swaps immediately. (b) A begin/end
pair that swaps on end.

**Decision: (a).**

**Rationale.** One call can't be left unbalanced, and nothing observes the
target between the call and the draw.

### DL-2: The second buffer lives on the render target

**Options.** (a) On `RenderTarget`, lazily. (b) A separate post-processing
object per camera.

**Decision: (a).**

**Rationale.** Effects are keyed by target today (several cameras can
share one, and each effect processes a target once per frame); keeping the
swap buffer with the target keeps that true, and targets that are never
post-processed never allocate it.

---

## 7. Open questions

None.

---

## 8. Testing considerations

- `beginPostProcessPass`: allocates on first use, alternates on each call,
  binds the right framebuffer, resizes and disposes both buffers; sprites
  drawn into the target after a pass land in the buffer that's presented.
- Each effect's existing unit tests, updated to expect one draw less.
- e2e: `bloom-over-background` and `translucent-ui-compositing` unchanged.

## 9. Documentation and demo follow-up

- `rendering/multipass-rendering.md`: a "Writing a post-processing effect"
  section with the two-line pattern.
- Demo: the refraction and glitch systems drop their scratch targets, copy
  materials and copy-backs; the graphics-quality system sets bloom passes
  without juggling intensity.
