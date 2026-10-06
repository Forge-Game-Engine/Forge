# Design: Render Resolution and Canvas-Sized Render Targets

|                                       |                                                                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                |
| **Kind**                              | Defect and feature                                                                                                                                               |
| **Found in**                          | Galactic Journey demo: `src/graphics/graphics-quality.system.ts` (`maxPixelRatio` written through a cast), `src/rendering/resize-render-targets.system.ts`, `src/shockwave/refraction.system.ts`, `src/glitch/glitch.system.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                         |
| **Related**                           | [`post-processing-effects.md`](./post-processing-effects.md), [`camera-views.md`](./camera-views.md), [`webgl-context-loss.md`](./webgl-context-loss.md)          |

## 0. Targeted modules

| Path                                              | Change   | Notes                                                                                   |
| ------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `src/rendering/render-context.ts`                 | Modified | `maxPixelRatio` settable; resizes canvas-relative render targets with the canvas           |
| `src/rendering/render-target.ts`                  | Modified | Created either canvas-relative (with a scale) or fixed-size                                |
| `src/ui/systems/ui-layout-system.ts`              | Modified | Stops resizing camera render targets                                                    |
| `src/rendering/systems/{bloom,gaussian-blur,tone-map}-system.ts` | Modified | Scratch targets created canvas-relative instead of checked and resized each frame |
| `documentation-site/docs/docs/rendering/multipass-rendering.md` | Modified | The "also resize your targets" caution is deleted                           |

---

## 1. Summary

The canvas resizes itself to its container (`createContainerResizeSync`
calls `RenderContext.resize`), but nothing else follows it:

- **Render targets are fixed-size.** A camera that renders into a
  `RenderTarget` meant to cover the canvas keeps its creation size after
  the window changes. The multipass guide tells callers to resize their
  targets themselves; the demo has a system that does it every frame for
  its background and foreground targets. Forge's UI layout system resizes
  each screen-space canvas camera's target as a side job, and the bloom,
  blur and tone-mapping systems each check and resize their scratch
  targets. The demo's shockwave and glitch effects do the same for theirs.
- **The pixel ratio can't change at runtime.** `maxPixelRatio` caps the
  canvas's resolution on dense displays, which is how a game trades
  sharpness for fill rate. It's `readonly`, so the demo's graphics-quality
  setting writes it through a cast and calls `resize` with the current
  size to apply it. It has to skip that call while the page is hidden,
  because `resize` throws on a zero size.

This design makes "as big as the canvas" a size a render target can have,
owned by the render context, and makes the pixel-ratio cap a setting.

---

## 2. Scope

### In scope

- Render targets sized relative to the canvas, resized by the render
  context.
- A settable `maxPixelRatio`.
- Migrating the engine's own scratch targets and the UI canvas targets.

### Out of scope

- **Dynamic resolution** (adjusting resolution automatically to hold a
  frame rate). A game can set `maxPixelRatio` from its own frame-time
  measurements.
- **Rendering below CSS resolution** (a ratio under `1`). Possible with the
  same setting, but the UI's screen-pixel sizing assumes at least `1`;
  worth its own look.

---

## 3. How established engines handle this

- **Unity**: the render pipelines allocate intermediate targets through
  the RTHandle system, sized as a scale of the camera's viewport
  (`RTHandles.Alloc(Vector2.one * 0.5f)`) and resized automatically.
  `renderScale` on the URP asset can be changed at runtime.
- **Godot**: `Viewport` render sizes follow their container
  (`SubViewportContainer.stretch`); `scaling_3d_scale` changes resolution
  at runtime.
- **Bevy**: the post-processing textures behind each view are sized from
  the view and reallocated when it changes. The window's scale factor can
  be overridden at runtime.

Intermediate targets are sized relative to what they're drawn over, and
the renderer keeps them in step. Resolution is a setting.

---

## 4. Design

### 4.1 Render target sizes

```ts
type RenderTargetSize =
  | { width: number; height: number }
  /** The canvas's drawing buffer (device pixels) times the scale: full resolution at `1`. */
  | { canvasScale: number }
  /** The canvas's CSS size times the scale: the same physical resolution on every display. */
  | { cssScale: number };

function createRenderTarget(
  renderContext: RenderContext,
  size: RenderTargetSize,
  format?: RenderTargetFormat,
): RenderTarget;
```

Sizes are rounded and at least 1x1. A canvas-relative target is
registered with its render context, which resizes it in
`RenderContext.resize`, so it's never out of step with the canvas for a
frame. `dispose` unregisters it. A fixed-size target behaves as today.

Both canvas-relative kinds are needed: a camera target has to match the
drawing buffer it's presented onto, while screen-space effects are sized
in CSS pixels so they look the same on every display (see "Device Pixels
vs. CSS Pixels" in `AGENTS.md`).

`createRenderTarget` takes the render context instead of `gl` for both
kinds, which also lets
[`webgl-context-loss.md`](./webgl-context-loss.md) restore every target.

### 4.2 Who uses which

- Camera targets that cover the canvas (the demo's background and
  foreground, UI screen-space canvases): `{ canvasScale: 1 }`. The UI layout
  system stops resizing them.
- Bloom's downsampled targets: `{ cssScale: 1 / 4 }`, which is the size
  its `4 * pixelRatio` texel blocks produce today. The Gaussian blur's
  averaged-down target: `{ cssScale: 1 }`.
- Tone mapping's scratch target, and the scratch targets that
  [`post-processing-effects.md`](./post-processing-effects.md) gives
  every effect: `{ canvasScale: 1 }`.
- A minimap or a render-to-texture with its own resolution: fixed.

### 4.3 `maxPixelRatio`

`maxPixelRatio` becomes a property with a setter. Setting it re-applies
the last `resize` (the current CSS size and device pixel ratio) if the
canvas has a size, and is remembered for the next resize if it doesn't, so
callers never see the zero-size error. Every canvas-relative target follows.

---

## 5. Phases

### Phase 1: Canvas-relative targets and a settable pixel ratio

| #   | Task                                                                                                  | Size |
| --- | ----------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `RenderTargetSize`; `createRenderTarget(renderContext, size, format)`; registration and `dispose`      | M    |
| 1.2 | `RenderContext.resize` resizes canvas-relative targets; tests at pixel ratios `1` and `2`                | S    |
| 1.3 | `maxPixelRatio` setter, including while the canvas has no size                                        | S    |
| 1.4 | UI canvas, bloom, blur and tone mapping targets become canvas-relative; per-frame checks deleted      | M    |
| 1.5 | Migrate docs demos and e2e scenes; delete the multipass caution; changelog under `#### Changed`        | S    |

**Definition of done:** no code outside the render context resizes a
render target to follow the canvas; changing `maxPixelRatio` at runtime
re-renders at the new resolution.

---

## 6. Decision log

### DL-1: The render context resizes canvas-relative targets

**Options.** (a) The render context, during its own resize. (b) A system
that resizes targets each frame. (c) Each consumer, as today.

**Decision: (a).**

**Rationale.** The render context is where the canvas size changes, so
updating dependent sizes there means one writer and no frame where they
disagree. (b) is the demo's workaround moved into the engine: it runs
every frame to catch an event that happens rarely, and has to be ordered
before every system that draws. (c) is the defect.

### DL-2: A scale, not a callback

**Options.** (a) A scale of the drawing buffer or of the CSS size. (b) A
function from canvas size to target size.

**Decision: (a).**

**Rationale.** Every case in the engine and the demo is "the canvas times
a factor", in one of the two units. A callback would be flexibility
without a use.

---

## 7. Open questions

None.

---

## 8. Testing considerations

- `RenderContext.resize` resizes registered targets of both kinds, at
  pixel ratios `1` and `2`, and not fixed ones; `dispose` unregisters.
- Setting `maxPixelRatio` while sized and while unsized.
- e2e: `high-dpi-canvas` resizes the page and asserts a camera target
  followed, using the relative measurement pattern.

## 9. Documentation and demo follow-up

- `rendering/multipass-rendering.md`: targets are created canvas-relative;
  the caution goes.
- Demo: `resize-render-targets.system.ts` and the cast in
  `graphics-quality.system.ts` are deleted; its effects create
  canvas-relative scratch targets.
