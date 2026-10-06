# Design: Camera Views and View Culling

|                                       |                                                                                                                                                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                                            |
| **Kind**                              | Feature and defect                                                                                                                                                                                                           |
| **Found in**                          | Galactic Journey demo: `src/constants.ts`, 32 `calculateVisibleWorldSize` calls in 16 files, `src/speed/create-hud.ts` and `src/health/health.system.ts` (`hudUnitsPerWorldUnit`), `src/journey/planet.system.ts` and `finish-line.system.ts` (hidden by hand while off screen), `src/shockwave/refraction.system.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                     |
| **Related**                           | [`render-resolution.md`](./render-resolution.md), [`post-processing-effects.md`](./post-processing-effects.md), [`angle-conventions.md`](./angle-conventions.md)                                                               |

## 0. Targeted modules

| Path                                                     | Change   | Notes                                                                                           |
| -------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `src/rendering/camera-view.ts`                           | **New**  | `getCameraView`: what a camera sees, and conversions between its world and its viewport         |
| `src/rendering/transforms/*`                             | Removed  | `worldToScreenSpace`, `screenToWorldSpace`, `canvasToWorldSpace`                                |
| `src/rendering/utilities/calculate-visible-world-size.ts` | Removed  | Replaced by the view's `size`                                                                   |
| `src/rendering/systems/render-system.ts`                 | Modified | Builds its projection from the view; skips sprites outside it                                   |
| `src/rendering/shaders/sprite/*`, instance data, projection | Modified | Internal: the Y-down flips are removed (§4.4)                                                |
| `src/ui/utilities/resolve-canvas-pointer-position.ts`    | Modified | Uses the view                                                                                   |
| `documentation-site/docs/docs/rendering/world-units-and-cameras.md`, demos | Modified | One way to convert positions                                        |

---

## 1. Summary

A camera's view (the world area it shows) is computed inside the render
system from `verticalWorldUnits`, `zoom`, the camera's world position and
the canvas size. Game code that needs the same information recomputes it
from pieces:

- **Visible size.** `calculateVisibleWorldSize(width, height,
  verticalWorldUnits)` needs the camera's `verticalWorldUnits`, but game
  systems don't have the camera, so the demo copies the default (`10`)
  into its own constant, noting that Forge doesn't export it. It calls
  `calculateVisibleWorldSize` 32 times across 16 files. The function
  ignores `zoom` and the camera's position, so it's only right for a
  camera at the origin with a zoom of `1`.
- **Converting between cameras.** The demo's speed HUD and health bars are
  drawn by a second camera whose units are 1080p pixels. To place a ring
  around the ship, it multiplies the ship's position by
  `hudUnitsPerWorldUnit`, a constant derived from both cameras' settings,
  again assuming both sit at the origin with a zoom of `1`.
- **Pointer conversion.** Every docs demo that reads the mouse in world
  space calls `calculatePixelsPerUnit` and `screenToWorldSpace` with the
  CSS canvas size, a copy of its camera's `verticalWorldUnits`, and a zero
  position and zoom of `1`. The UI's `resolveCanvasPointerPosition` does
  the same with the real camera.
- **`worldToScreenSpace` is wrong.** It doesn't flip Y, so it isn't the
  inverse of `screenToWorldSpace`, which does.
- **No culling.** The render system draws every enabled sprite, on screen
  or not. The demo's planet and finish line wait off screen for most of a
  run, so their systems hide them until they reach the screen edge.

This design gives cameras a view that game code can ask for, with
conversions to and from the viewport, and makes the render system cull
against it.

---

## 2. Scope

### In scope

- `getCameraView(world, camera, renderContext)` returning the camera's
  visible bounds, size, scale, and conversions between world and viewport.
- Removing the free conversion functions and `calculateVisibleWorldSize`.
- Culling sprites (and text) whose bounds are outside the view.
- Removing the renderer's internal Y-down flips, which are why
  `worldToScreenSpace` got the direction wrong.

### Out of scope

- **Camera rotation.** Cameras don't rotate today.
- **Camera follow, shake and other camera controllers.** Game feel, and
  the demo's shake works without engine help.
- **The camera's built-in pan and zoom input** (`zoomInput`, `panInput`).
  Unchanged here.
- **Render target sizing.** See [`render-resolution.md`](./render-resolution.md).

---

## 3. How established engines handle this

- **Unity**: `Camera.orthographicSize` and `aspect` give the view;
  `WorldToScreenPoint`, `ScreenToWorldPoint`, `WorldToViewportPoint` and
  `ViewportToWorldPoint` convert. Renderers outside the frustum are culled.
- **Godot**: `Viewport.get_visible_rect()` and the canvas transform give
  the view; `get_global_mouse_position()` converts the pointer. Canvas items
  outside the viewport are culled.
- **Bevy**: `Camera::world_to_viewport` and `viewport_to_world_2d` convert
  using the camera's computed projection; `VisibilitySystems` cull
  entities whose `Aabb` is outside the view frustum.

The camera is the object that answers "what do I see and where is this
point on screen", and the renderer culls against the same answer.

---

## 4. Design

### 4.1 The view

```ts
interface CameraView {
  /** The world-space area the camera shows. */
  readonly bounds: Rect;
  /** `bounds`' size, in world units. */
  readonly size: Vector2;
  /** CSS pixels per world unit on the canvas. */
  readonly pixelsPerUnit: number;
  /** A world position as CSS pixels from the canvas's top-left (Y-down, like pointer positions). */
  worldToViewport(worldPosition: Vector2): Vector2;
  /** The inverse of `worldToViewport`. */
  viewportToWorld(viewportPosition: Vector2): Vector2;
}

function getCameraView(
  world: EcsWorld,
  camera: Entity,
  renderContext: RenderContext,
): CameraView;
```

It's computed from the camera's `zoom`, `verticalWorldUnits`,
`position.world` and the canvas's CSS size whenever it's called. Nothing is
stored, so it can't go stale and has no owning system. It throws if
`camera` has no `CameraEcsComponent` or position.

Viewport positions are in CSS pixels because that's what pointer input,
the DOM and the safe area use (see "Device Pixels vs. CSS Pixels" in
`AGENTS.md`). The render system uses the same function and converts to
device pixels where it talks to GL, so there's one place where a view is
derived.

### 4.2 What it replaces

| Today                                                            | With views                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| `calculateVisibleWorldSize(w, h, verticalWorldUnits)`            | `getCameraView(world, camera, renderContext).size`     |
| `screenToWorldSpace(p, position, zoom, w, h, ppu)`               | `view.viewportToWorld(p)`                              |
| `worldToScreenSpace(...)`                                        | `view.worldToViewport(p)`                              |
| World position on camera A to camera B (the demo's HUD)          | `viewB.viewportToWorld(viewA.worldToViewport(p))`      |

`calculateVisibleWorldSize`, `worldToScreenSpace`, `screenToWorldSpace` and
`canvasToWorldSpace` are removed. `calculatePixelsPerUnit` becomes internal
to the view.

### 4.3 View culling

The render system skips a sprite whose world bounds (from its size, pivot,
rotation and scale) don't overlap the camera's `bounds`, before building
its draw command. Text is culled the same way with its mesh bounds.
Nine-slice sprites use their whole rect. A sprite that's off screen costs
a bounds test instead of an instance.

Systems that hide sprites only because they're off screen (the demo's
planet and finish line) delete that code.

### 4.4 No internal Y flips

The renderer works in a Y-down space internally: instance data negates
`position.world.y` and rotation, the sprite vertex shader flips pivot Y,
and the projection scales Y by `-2 / height` and translates by the camera's
unnegated Y. Each flip cancels another, but every function that converts
coordinates has to know about them, and `worldToScreenSpace` didn't.

WebGL's clip space is Y-up, like Forge's world, so the projection becomes a
plain scale and translation and every flip is deleted. Render targets then
store their rows bottom-up, which is GL's own convention, and the present
and post-processing passes sample them with unflipped UVs. This is an
internal change: nothing visible moves.

---

## 5. Phases

### Phase 1: Camera views

| #   | Task                                                                                                 | Size |
| --- | ---------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `getCameraView` with bounds, size, scale and conversions; tests including zoom, position, HiDPI      | M    |
| 1.2 | Render system and UI pointer resolution use it                                                       | S    |
| 1.3 | Remove the conversion functions and `calculateVisibleWorldSize`; migrate docs demos (31 files) and e2e | M    |
| 1.4 | `world-units-and-cameras.md` rewritten around views; changelog under `#### Changed`                  | S    |

**Definition of done:** no public conversion function outside the view;
the docs demos read the pointer through their camera's view.

### Phase 2: View culling

| #   | Task                                                                          | Size |
| --- | ----------------------------------------------------------------------------- | ---- |
| 2.1 | Sprite and text bounds; skip commands outside the view                        | M    |
| 2.2 | Tests: rotated and scaled sprites at the edges; nine-slice; text              | S    |
| 2.3 | Stress-test demo before and after; changelog under `#### Changed`             | S    |

**Definition of done:** sprites outside every camera's view produce no
instances, and nothing on screen changes.

### Phase 3: Y-up throughout the renderer

| #   | Task                                                                                       | Size |
| --- | ------------------------------------------------------------------------------------------ | ---- |
| 3.1 | Projection without the flip; instance data, sprite and text shaders, terrain without flips | M    |
| 3.2 | Present and post-processing passes sample render targets with unflipped UVs                | S    |
| 3.3 | e2e suite unchanged and passing; the rendering scenes are the check                        | S    |

**Definition of done:** no Y negation remains in the render path, and the
e2e and docs demos render as before.

Phases are independent; Phase 1 is the one the demo needs.

---

## 6. Decision log

### DL-1: Computed on demand, not stored on the camera

**Options.** (a) A function computing the view from components. (b) A
`view` field on `CameraEcsComponent`, written by a camera system each
frame.

**Decision: (a).**

**Rationale.** The computation is a few multiplications. (b) adds a
system that has to run after anything moving the camera and before
anything reading the view, and a field with an owner to respect. Bevy
stores its computed projection because perspective and custom projections
make it expensive; Forge's orthographic view isn't.

### DL-2: Viewport positions in CSS pixels

**Rationale.** Every consumer of a viewport position in Forge is in CSS
pixels: pointer input, the DOM, safe-area insets, UI sized in screen
pixels. Device pixels only matter to GL, which the render system handles.

### DL-3: Culling in the render system, not a visibility component

**Options.** (a) The render system tests bounds while building commands.
(b) A visibility system writing a per-entity "visible in view" component
(Bevy's `ViewVisibility`).

**Decision: (a).**

**Rationale.** Only rendering uses the result today. (b) is the right
shape once something else needs it (audio, AI), and can be extracted then.

---

## 7. Open questions

1. **Should `getCameraView` take the camera's `CameraEcsComponent` and
   position instead of an entity?** Systems that already query cameras
   would avoid the lookups.
   - (a) Entity (proposed; simplest for game code). (b) Both overloads,
     which the "no overloads" rule argues against.

---

## 8. Testing considerations

- View: bounds at zoom `1` and `2`, a moved camera, a non-square canvas,
  and `pixelRatio` `2` (the CSS size is what counts);
  `viewportToWorld(worldToViewport(p))` round trip.
- Culling: a sprite just outside the edge is skipped, one overlapping it
  by a pixel is drawn, rotation and scale are respected.
- e2e: `camera-pan-zoom` asserts the pointer-to-world conversion through
  the view; the existing rendering specs cover Phase 3.

## 9. Documentation and demo follow-up

- `rendering/world-units-and-cameras.md`: "Converting screen and world
  positions" uses the view; culling is mentioned.
- Demo: `constants.ts`'s mirrored `verticalWorldUnits`, the 32
  `calculateVisibleWorldSize` calls, `hudUnitsPerWorldUnit` and the
  planet and finish line hiding are replaced or deleted.
