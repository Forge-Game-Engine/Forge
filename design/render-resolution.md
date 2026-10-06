# Design: Render Resolution and Canvas-Sized Render Targets

|                                       |                                                                                                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                  |
| **Kind**                              | Defect and feature                                                                                                                                                                                 |
| **Found in**                          | Galactic Journey demo: `src/graphics/graphics-quality.system.ts` (`maxPixelRatio` written through a cast), `src/rendering/resize-render-targets.system.ts`, `src/systems/register-draw-systems.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                           |
| **Related**                           | [`webgl-context-loss.md`](./webgl-context-loss.md)                                                                                                                                                 |

## 0. Targeted modules

| Path                                                                                                                                    | Change   | Notes                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `src/rendering/render-context.ts`                                                                                                       | Modified | `maxPixelRatio` settable; size fields read-only; resizes canvas-sized render targets with the canvas |
| `src/rendering/render-target.ts`, `ping-pong-target.ts`                                                                                 | Modified | Created canvas-sized or fixed-size; `resize` only for fixed-size targets                             |
| `src/ui/systems/ui-layout-system.ts`, `src/ui/utilities/create-ui-canvas.ts`                                                            | Modified | Screen-space canvas targets are canvas-sized; the layout system stops resizing them                  |
| `documentation-site/docs/docs/rendering/multipass-rendering.md`, `bloom.md`, `gaussian-blur.md`, `hdr-rendering.md`, space-shooter demo | Modified | Canvas-sized targets; the "also resize your targets" caution is deleted                              |

---

## 1. Summary

The canvas resizes itself to its container (`createContainerResizeSync`
calls `RenderContext.resize`), but the render targets cameras draw into
don't follow it:

- **Camera targets are fixed-size.** A camera that renders into a
  `RenderTarget` meant to cover the canvas keeps its creation size after
  the window changes. The multipass guide tells callers to resize their
  targets themselves; the demo has a system that does it every frame for
  its background, foreground and HUD targets; and Forge's UI layout system
  resizes each screen-space canvas camera's target as a second job.
- **The pixel ratio can't change at runtime.** `maxPixelRatio` caps the
  canvas's resolution on dense displays, which is how a game trades
  sharpness for fill rate. It's `readonly`, so the demo's graphics-quality
  setting writes it through a cast and calls `resize` with the current
  size to apply it. It has to skip that call while the page is hidden,
  because `resize` throws on a zero size.

This design makes "as big as the canvas" a size a render target can have,
owned by the render context, and makes the pixel-ratio cap a setting.

Effects' intermediate targets are a different case and stay as they are:
bloom's downsampled targets and the blur's averaged target are sized from
the camera target they process, not from the canvas, which is right
(Unity's RTHandles and Bevy's view textures scale with the camera's
target too). The effects no longer keep full-size scratch targets: they
write the camera target's second color buffer through
`beginPostProcessPass`.

---

## 2. Scope

### In scope

- Canvas-sized render targets, resized by the render context.
- A settable `maxPixelRatio`; the render context's size fields read-only.
- Migrating camera targets (the docs demos, the UI's screen-space
  canvases) to canvas-sized targets.

### Out of scope

- **Effects' intermediate targets**, sized from their source target as
  today.
- **Dynamic resolution** (adjusting resolution automatically to hold a
  frame rate). A game can set `maxPixelRatio` from its own frame-time
  measurements.
- **Rendering below CSS resolution** (a ratio under `1`) and render
  scales other than the canvas's. Text effect widths, the blur's step and
  bloom's block size all read `renderContext.pixelRatio`, so a target at a
  different scale would need them to read the target's own ratio; nothing
  needs it yet.

---

## 3. How established engines handle this

- **Unity**: the render pipelines allocate intermediate targets through
  the RTHandle system, sized relative to the camera's viewport and
  resized automatically. `renderScale` on the URP asset can be changed at
  runtime.
- **Godot**: `SubViewport`s follow their container when
  `SubViewportContainer.stretch` is on.
- **Bevy**: the textures behind each view are sized from the view and
  reallocated when it changes. The window's scale factor can be
  overridden at runtime.

Targets that cover the screen are sized by the engine, from what they
cover; resolution is a setting.

---

## 4. Design

### 4.1 Render target sizes

```ts
type RenderTargetSize =
  | { width: number; height: number }
  /** The canvas's drawing buffer, in device pixels. */
  | 'canvas';

function createRenderTarget(
  renderContext: RenderContext,
  size: RenderTargetSize,
  format?: RenderTargetFormat,
): RenderTarget;
```

A canvas-sized target is registered with its render context, which
resizes it in `RenderContext.resize`, so it's never out of step with the
canvas for a frame. `dispose` unregisters it. A fixed-size target behaves
as today. `RenderTarget.resize` stays for fixed-size targets and throws
for a canvas-sized one, so the render context is the only writer of a
canvas-sized target's size. (A target's second color buffer, used by
`beginPostProcessPass`, is resized inside `resize`, so it follows either
kind.)

`createRenderTarget` and `PingPongTarget` take the render context instead
of `gl`, which also lets [`webgl-context-loss.md`](./webgl-context-loss.md)
restore every target.

### 4.2 Who uses which

- Camera targets that cover the canvas (the demo's background, foreground
  and HUD; the UI's screen-space canvases): `'canvas'`. The UI layout
  system stops resizing them.
- A minimap or a render-to-texture with its own resolution: fixed.
- Effects' intermediates: unchanged (§1).

### 4.3 The render context's sizes

`maxPixelRatio` becomes a property with a setter. The render context
stores the last device pixel ratio it was given (today it's only a
`resize` parameter); setting `maxPixelRatio` re-applies the last resize if
the canvas has a size, and is remembered for the next resize if it
doesn't, so callers never see the zero-size error. Every canvas-sized
target follows.

`width`, `height`, `cssWidth`, `cssHeight` and `pixelRatio` become
read-only to callers: `resize` is their only writer.

---

## 5. Phases

### Phase 1: Canvas-sized targets and a settable pixel ratio

| #   | Task                                                                                                                                                                                   | Size |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `RenderTargetSize`; `createRenderTarget(renderContext, size, format)`; registration and `dispose`; `resize` fixed-size only; `PingPongTarget`                                          | M    |
| 1.2 | `RenderContext.resize` resizes canvas-sized targets; size fields read-only; tests at pixel ratios `1` and `2`                                                                          | S    |
| 1.3 | `maxPixelRatio` setter using the stored device pixel ratio, including while the canvas has no size                                                                                     | S    |
| 1.4 | UI screen-space canvas targets become canvas-sized; the layout system's resizing deleted                                                                                               | S    |
| 1.5 | Migrate docs demos (space shooter included) and e2e scenes (`bloom-over-background`, `translucent-ui-compositing`, `post-process-pixel-ratio`); guides; changelog under `#### Changed` | M    |

**Definition of done:** no code outside the render context resizes a
render target to follow the canvas; changing `maxPixelRatio` at runtime
re-renders at the new resolution.

---

## 6. Decision log

### DL-1: The render context resizes canvas-sized targets

**Options.** (a) The render context, during its own resize. (b) A system
that resizes targets each frame. (c) Each consumer, as today.

**Decision: (a).**

**Rationale.** The render context is where the canvas size changes, so
updating dependent sizes there means one writer and no frame where they
disagree. (b) is the demo's workaround moved into the engine: it runs
every frame to catch an event that happens rarely, and has to be ordered
before every system that draws. (c) is the defect.

### DL-2: Only the canvas size, no scale factor

**Options.** (a) `'canvas'`. (b) A scale of the canvas (`canvasScale`, or
a CSS-pixel scale).

**Decision: (a).**

**Rationale.** Every camera target in the engine, the docs and the demo
covers the canvas at full resolution. The effects that work at reduced
resolution derive it from their source target, not the canvas, and a
target at another scale would need every pixel-ratio-dependent effect to
follow (§2). A scale can be added when a game needs one.

---

## 7. Open questions

None.

---

## 8. Testing considerations

- `RenderContext.resize` resizes registered targets, at pixel ratios `1`
  and `2`, and not fixed ones; `dispose` unregisters; `resize` on a
  canvas-sized target throws.
- Setting `maxPixelRatio` while sized and while unsized; it uses the last
  device pixel ratio, not the clamped one.
- e2e: `high-dpi-canvas` resizes the page and asserts a camera target
  followed, using the relative measurement pattern.

## 9. Documentation and demo follow-up

- `rendering/multipass-rendering.md`: camera targets are created
  canvas-sized; the caution goes. `bloom.md`, `gaussian-blur.md` and
  `hdr-rendering.md` samples create their targets the same way.
- Demo: `resize-render-targets.system.ts` and the cast in
  `graphics-quality.system.ts` are deleted.
