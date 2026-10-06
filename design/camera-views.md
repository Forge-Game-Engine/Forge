# Design: Camera Views and View Culling

|                                       |                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**                            | Draft, for review                                                                                                                                                                                                                                                                                                   |
| **Kind**                              | Feature and defect                                                                                                                                                                                                                                                                                                  |
| **Found in**                          | Galactic Journey demo: `src/constants.ts`, `calculateVisibleWorldSize` called in 16 files, `src/speed/create-hud.ts` and `src/health/health.system.ts` (`hudUnitsPerWorldUnit`), `src/journey/planet.system.ts` and `finish-line.system.ts` (hidden by hand while off screen), `src/shockwave/refraction.system.ts` |
| **Engine version at time of writing** | `0.25.8`                                                                                                                                                                                                                                                                                                            |
| **Related**                           | [`render-resolution.md`](./render-resolution.md), [`post-processing-effects.md`](./post-processing-effects.md), [`sprite-textures.md`](./sprite-textures.md)                                                                                                                                                        |

## 0. Targeted modules

| Path                                                                                                                  | Change             | Notes                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `src/rendering/camera-view.ts`                                                                                        | **New**            | `computeCameraView` and `getCameraView`: what a camera sees, and conversions between its world and its viewport |
| `src/rendering/transforms/*`                                                                                          | Removed            | `worldToScreenSpace`, `screenToWorldSpace`, `canvasToWorldSpace`                                                |
| `src/rendering/utilities/calculate-visible-world-size.ts`, `calculate-pixels-per-unit.ts`                             | Removed / internal | Replaced by the view                                                                                            |
| `src/rendering/systems/render-system.ts`                                                                              | Modified           | Builds each camera's projection from its view (and its destination's size); skips sprites and text outside it   |
| `src/rendering/terrain/create-terrain-render-ecs-system.ts`                                                           | Modified           | Builds its projection from the view instead of its own copy of the maths                                        |
| `src/ui/systems/ui-layout-system.ts`, `ui-safe-area-system.ts`, `src/ui/utilities/resolve-canvas-pointer-position.ts` | Modified           | Use the view for pixels per unit and pointer conversion                                                         |
| `src/rendering/components/camera-component.ts`                                                                        | Modified           | `scissorRect`, which nothing reads, is removed                                                                  |
| `documentation-site/docs/docs/rendering/world-units-and-cameras.md`, `physics/forces.md`, `ecs/game.md`, demos, e2e   | Modified           | One way to convert positions                                                                                    |

---

## 1. Summary

A camera's view (the world area it shows) is computed inside the render
system from `verticalWorldUnits`, `zoom`, the camera's world position and
the canvas size. The terrain system repeats that maths for its own
projection, and the UI computes pixels per unit itself. Game code that
needs the same information recomputes it from pieces:

- **Visible size.** `calculateVisibleWorldSize(width, height,
verticalWorldUnits)` needs the camera's `verticalWorldUnits`, but game
  systems don't have the camera, so the demo copies the default (`10`)
  into its own constant, noting that Forge doesn't export it. It calls
  `calculateVisibleWorldSize` in 16 files. The function ignores `zoom` and
  the camera's position, so it's only right for a camera at the origin
  with a zoom of `1`.
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
- **`worldToScreenSpace` is wrong.** It doesn't flip Y from the Y-up world
  to the Y-down page, so it isn't the inverse of `screenToWorldSpace`,
  which does.
- **No culling.** The render system draws every enabled sprite, on screen
  or not. The demo's planet and finish line wait off screen for most of a
  run, so their systems hide them until they reach the screen edge.
- **A camera rendering into a target of a different shape** is projected
  with the canvas's size anyway, so it renders stretched.

This design gives cameras a view that game code can ask for, with
conversions to and from the viewport, derives it from where the camera
actually draws, and makes the render system cull against it.

---

## 2. Scope

### In scope

- `computeCameraView` (pure, over a camera's components and its
  destination size) and `getCameraView(world, camera, renderContext)` (the
  entity lookup) returning the camera's visible bounds, size, scale, and
  conversions between world and viewport.
- The render, terrain and UI systems using it.
- Removing the free conversion functions, `calculateVisibleWorldSize`,
  and the unused `scissorRect`.
- Culling sprites and text whose bounds are outside the view.

### Out of scope

- **Camera rotation.** Cameras don't rotate today.
- **Camera follow, shake and other camera controllers.** Game feel, and
  the demo's shake works without engine help.
- **The camera's built-in pan and zoom input** (`zoomInput`, `panInput`).
  Unchanged here.
- **Render target sizing.** See [`render-resolution.md`](./render-resolution.md).
- **The renderer's internal Y-down space.** The sprite renderer negates
  position, rotation and pivot Y on the way to a Y-down projection, and
  images are uploaded top row first, which that space relies on. It's
  invisible to callers and not why `worldToScreenSpace` is wrong; changing
  it would flip every image unless uploads or the quad's texture
  coordinates changed too, and it would change the contract custom vertex
  shaders rely on. If it's ever worth doing, it needs its own design.

---

## 3. How established engines handle this

- **Unity**: `Camera.orthographicSize` and `aspect` give the view;
  `WorldToScreenPoint`, `ScreenToWorldPoint`, `WorldToViewportPoint` and
  `ViewportToWorldPoint` convert (Unity's "viewport" is normalized,
  bottom-left). Renderers outside the frustum are culled.
- **Godot**: `Viewport.get_visible_rect()` and the canvas transform give
  the view; `get_global_mouse_position()` converts the pointer. Canvas items
  outside the viewport are culled.
- **Bevy**: `Camera::world_to_viewport` and `viewport_to_world_2d` convert
  in logical pixels from the top-left, using the camera's computed
  projection, which Bevy stores because it depends on the size of the
  camera's render target. `VisibilitySystems` cull entities whose `Aabb` is
  outside the view frustum; `NoFrustumCulling` opts an entity out.

The camera is the object that answers "what do I see and where is this
point on screen", derived from where it draws, and the renderer culls
against the same answer. Forge's naming follows Bevy's (viewport positions
in CSS pixels from the top-left).

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

/** Pure: for systems that already have the camera's components. */
function computeCameraView(
  camera: CameraEcsComponent,
  position: PositionEcsComponent,
  renderContext: RenderContext,
): CameraView;

/** Looks the camera's components up; for game code. */
function getCameraView(
  world: EcsWorld,
  camera: number,
  renderContext: RenderContext,
): CameraView;
```

The view's aspect comes from the camera's destination: its render
target's size if it has one, the canvas otherwise. Its scale comes from
`zoom` and `verticalWorldUnits`, and its center from `position.world`.
Viewport positions are in CSS pixels of the canvas, because that's what
pointer input, the DOM and the safe area use (see "Device Pixels vs. CSS
Pixels" in `AGENTS.md`); `worldToViewport` flips Y, which is the step
`worldToScreenSpace` misses.

It's computed whenever it's called, so nothing is stored and nothing owns
it. It reflects the camera's state when called: a system that runs before
the transform system or the UI layout system (which writes UI cameras'
`verticalWorldUnits`) sees last tick's view, like any reader of
`position.world`. `getCameraView` throws if `camera` has no
`CameraEcsComponent` or position.

### 4.2 Who uses it

- The render system builds each camera's projection from its view, using
  the destination's size, so a camera rendering into a target of another
  shape is no longer stretched.
- The terrain system builds its projection from the same view instead of
  repeating the maths.
- The UI layout and safe-area systems and `resolveCanvasPointerPosition`
  take pixels per unit and pointer conversion from it.

That leaves one place where a view is derived, so `calculatePixelsPerUnit`
becomes internal.

### 4.3 What it replaces

| Today                                                   | With views                                         |
| ------------------------------------------------------- | -------------------------------------------------- |
| `calculateVisibleWorldSize(w, h, verticalWorldUnits)`   | `getCameraView(world, camera, renderContext).size` |
| `screenToWorldSpace(p, position, zoom, w, h, ppu)`      | `view.viewportToWorld(p)`                          |
| `worldToScreenSpace(...)`                               | `view.worldToViewport(p)`                          |
| World position on camera A to camera B (the demo's HUD) | `viewB.viewportToWorld(viewA.worldToViewport(p))`  |

`calculateVisibleWorldSize`, `worldToScreenSpace`, `screenToWorldSpace` and
`canvasToWorldSpace` are removed. So is `CameraEcsComponent.scissorRect`,
which nothing reads.

### 4.4 View culling

The render system skips a sprite whose world bounds don't overlap the
camera's `bounds`, before building its draw command:

- **Sprites**: the quad's bounds from size, pivot, rotation and scale.
  Nine-slice sprites use their whole rect. With
  [`sprite-textures.md`](./sprite-textures.md), every sprite material uses
  `sprite.vert`, so the quad is what's drawn.
- **Text**: the mesh's glyph bounds, placed at the text's world position
  and widened by its outline and shadow, which extend past the glyph
  quads.
- **Terrain** isn't culled in this design.

Systems that hide sprites only because they're off screen (the demo's
planet and finish line) delete that code.

---

## 5. Phases

### Phase 1: Camera views

| #   | Task                                                                                                                                                                                                       | Size |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1.1 | `computeCameraView`, `getCameraView`: bounds, size, scale and conversions from the camera's destination; tests including zoom, position, a target of another shape, HiDPI                                  | M    |
| 1.2 | Render, terrain, UI layout, safe-area and pointer resolution use it; `calculatePixelsPerUnit` internal                                                                                                     | M    |
| 1.3 | Remove the conversion functions, `calculateVisibleWorldSize` and `scissorRect`; migrate docs demos (31 files), Forge's own `/demo`, `physics/forces.md`, `ecs/game.md` and the `high-dpi-canvas` e2e scene | M    |
| 1.4 | `world-units-and-cameras.md` rewritten around views; changelog under `#### Changed`                                                                                                                        | S    |

**Definition of done:** no public conversion function outside the view;
the docs demos read the pointer through their camera's view; a camera
rendering into a non-canvas-shaped target isn't stretched.

### Phase 2: View culling

| #   | Task                                                                                       | Size |
| --- | ------------------------------------------------------------------------------------------ | ---- |
| 2.1 | Sprite and text bounds (text including outline and shadow); skip commands outside the view | M    |
| 2.2 | Tests: rotated and scaled sprites at the edges; nine-slice; text with effects              | S    |
| 2.3 | Stress-test demo before and after; changelog under `#### Changed`                          | S    |

**Definition of done:** sprites and text outside every camera's view
produce no instances, and nothing on screen changes.

---

## 6. Decision log

### DL-1: Computed on demand, not stored on the camera

**Options.** (a) Functions computing the view from components and the
destination size. (b) A `view` field on `CameraEcsComponent`, written by a
camera system each frame.

**Decision: (a).**

**Rationale.** The computation is a few multiplications, and computing it
on demand means it can't disagree with the camera's components. (b) adds
a system that has to run after anything moving the camera and before
anything reading the view, and a field with an owner to respect. What
Bevy's stored values teach is the dependency, not the storage: the view
depends on the camera's destination, so (a) reads it.

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

### DL-4: Two functions, not overloads

**Rationale.** Systems that already query cameras (render, terrain) call
the pure `computeCameraView` and skip the lookups; game code calls
`getCameraView` with an entity. Two named functions, rather than one
overloaded one, follow the "no overloads" rule.

---

## 7. Open questions

None.

---

## 8. Testing considerations

- View: bounds at zoom `1` and `2`, a moved camera, a non-square canvas, a
  camera with a render target of a different shape, and `pixelRatio` `2`
  (the CSS size is what counts); `viewportToWorld(worldToViewport(p))`
  round trip.
- Culling: a sprite just outside the edge is skipped, one overlapping it
  by a pixel is drawn, rotation and scale are respected, text with a
  shadow just off screen still draws its visible part.
- e2e: `camera-pan-zoom` asserts the pointer-to-world conversion through
  the view.

## 9. Documentation and demo follow-up

- `rendering/world-units-and-cameras.md`: "Converting screen and world
  positions" uses the view; culling is mentioned.
- Demo: `constants.ts`'s mirrored `verticalWorldUnits`, the
  `calculateVisibleWorldSize` calls, `hudUnitsPerWorldUnit` and the planet
  and finish line hiding are replaced or deleted.
