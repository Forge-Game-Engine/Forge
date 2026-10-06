# Design: Post-Processing Passes Without Copy-Back

|                                       |                                                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                  |
| **Kind**                              | Feature and defect                                                                                                                                 |
| **Found in**                          | Galactic Journey demo: `src/shockwave/refraction.system.ts`, `src/glitch/glitch.system.ts`, `src/graphics/graphics-quality.system.ts`              |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                           |
| **Related**                           | [`render-resolution.md`](./render-resolution.md), [`camera-views.md`](./camera-views.md), [`sprite-textures.md`](./sprite-textures.md)               |

## 0. Targeted modules

| Path                                                       | Change   | Notes                                                                                  |
| ---------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `src/rendering/render-target.ts`                           | Modified | A second color buffer, allocated on first use, that post-processing passes write into |
| `src/rendering/fullscreen-pass.ts`                         | Modified | `beginPostProcessPass`: binds the other buffer, swaps, returns the texture to read     |
| `src/rendering/systems/{bloom,gaussian-blur,tone-map}-system.ts` | Modified | Use it; their scratch full-resolution targets and copy-back passes are deleted   |
| `src/rendering/systems/bloom-system.ts`                    | Modified | `passes: 0` skips the effect, as it does for the blur                                  |
| `documentation-site/docs/docs/rendering/*.md`              | Modified | Writing a custom effect; pass counts                                                   |

---

## 1. Summary

A full-screen pass can't read and write the same texture. Forge's bloom,
blur and tone-mapping systems each deal with that the same way: draw the
effect into a full-resolution scratch target, then draw a copy of the
scratch target back into the camera's target. Each effect costs an extra
full-screen copy, and each system keeps its own map of scratch targets,
checks their size every frame, and disposes them on cleanup.

The demo's two custom effects (the shockwave's refraction and the hit
glitch) copy that code: a scratch target per camera target, a size check, a
copy material, the copy-back draw, and cleanup. Its comments point at the
tone-mapping system as the model. A game writing a screen effect has to
re-derive the engine's internal plumbing to do it.

A smaller inconsistency sits next to it: the blur does nothing at
`passes: 0`, but bloom at `passes: 0` still extracts and composites the
unblurred highlights, so the demo's graphics-quality setting turns bloom
off with `intensity: 0` and keeps the real intensity elsewhere to restore
it.

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
  downsampled chain). Those keep their own targets, sized as described in
  [`render-resolution.md`](./render-resolution.md).

---

## 3. How established engines handle this

- **Bevy**: `ViewTarget::post_process_write()` returns a `source` (the
  current main texture) and a `destination` (the other of two), and flips
  which one is "main". Every post-process node calls it; nothing copies
  back. Custom effects use the same call.
- **Unity URP**: renderer features blit between the camera color target
  and a swap buffer the pipeline manages (`Blitter`, and the render graph's
  automatic ping-pong in newer versions).
- **Godot**: the compositor gives effects the scene buffers; built-in
  effects alternate between internal buffers.

---

## 4. Design

### 4.1 Double-buffered targets

A `RenderTarget` gets a second color texture the first time a
post-processing pass runs on it, the same size and format.
`colorTexture` always names the current one, which sprites are drawn into
and which the present pass shows.

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
`colorTexture` between the call and the draw. (With
[`sprite-textures.md`](./sprite-textures.md), it returns a `Texture`.)

Code that samples a render target's color in a later pass reads
`colorTexture` when it draws, not once at setup, since the current buffer
changes. The present system already does.

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
`passes: 0`, and bloom at `intensity: 0` or `passes: 0`. Removing the
effect's component also turns it off, which is how tone mapping (which has
no neutral setting) is toggled.

---

## 5. Phases

### Phase 1: Post-process passes

| #   | Task                                                                                 | Size |
| --- | ------------------------------------------------------------------------------------ | ---- |
| 1.1 | Second color buffer on `RenderTarget`, allocated lazily, resized and disposed with it | S    |
| 1.2 | `beginPostProcessPass`; tests that it swaps and returns the previous texture          | S    |
| 1.3 | Tone map, blur and bloom use it; scratch targets and copy-backs deleted               | M    |
| 1.4 | Bloom skips at `passes: 0`                                                           | S    |
| 1.5 | Guide section "Writing a post-processing effect"; changelog under `#### Changed`      | S    |

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
  binds the right framebuffer, resizes and disposes both buffers.
- Each effect's existing unit tests, updated to expect one draw less.
- e2e: `bloom-over-background` and `translucent-ui-compositing` unchanged.

## 9. Documentation and demo follow-up

- `rendering/multipass-rendering.md`: a "Writing a post-processing effect"
  section with the two-line pattern.
- Demo: the refraction and glitch systems drop their scratch targets, copy
  materials and copy-backs; the graphics-quality system sets bloom passes
  without juggling intensity.
