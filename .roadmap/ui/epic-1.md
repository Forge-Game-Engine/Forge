# Epic 1 — UI Core & Layout Foundations

The foundational layer every other UI epic builds on. This epic establishes the
`src/ui` module, the screen-space coordinate model, the UI transform/layout
model, and resize-driven re-solving. It produces **no rendered pixels** (that is
Epic 2) — it produces the data model and the systems that keep that data
correct.

## Status

- **Phase:** 1 — Foundations
- **Depends on:** existing `ecs`, `common` (position/rotation/scale/parent),
  `math`, `events`, `rendering` (`RenderContext` only, for canvas size).
- **Blocks:** Epics 2–10.

## Architectural notes (grounded in the current codebase)

- The ECS is **data-oriented**, not class-based. Components are plain interfaces
  registered with `createComponentId<T>('name')` from
  [ecs-component.ts](../../src/ecs/ecs-component.ts). Systems are objects
  implementing `EcsSystem<Q, K>` from
  [ecs-system.ts](../../src/ecs/ecs-system.ts) with `query`, optional
  `beforeQuery`, `run`, and `cleanupEntities`. Follow this pattern for **all**
  new UI code; do **not** introduce `Component`/`System` base classes.
- Hierarchy already exists via `ParentComponent`
  ([parent-component.ts](../../src/common/components/parent-component.ts)) and is
  resolved by the transform systems in
  [src/common/systems](../../src/common/systems/). UI layout layers **on top**
  of this, it does not replace it.
- `PositionEcsComponent` already carries `local`, `world`, and `isStatic`
  ([position-component.ts](../../src/common/components/position-component.ts)).
  UI uses world-space position in **screen pixels** for the UI camera.

---

## Features

### F1.1 — `src/ui` module scaffolding & exports

**Goal:** make `src/ui` a real, exported module so later features have a home.

**Implementation detail:**

- Create `src/ui/index.ts` re-exporting `./components/index.js`,
  `./systems/index.js`, `./utilities/index.js`, and `./shaders/index.js`
  (mirroring [src/rendering/index.ts](../../src/rendering/index.ts)).
- Create empty barrel `index.ts` files in the existing
  `src/ui/components`, `src/ui/systems`, `src/ui/utilities`, `src/ui/shaders`
  folders.
- Add `export * from './ui/index.js';` to
  [src/index.ts](../../src/index.ts).
- Add a `./ui` export path to `package.json` `exports` (and any `typesVersions`
  block) so it is separately importable as `@forge-game-engine/forge/ui`,
  matching the other subsystems.
- Run `npm run check-exports` to confirm the mapping is valid.

**Tests/docs:** a placeholder is fine until real symbols exist; the export
wiring is verified by `check-exports` and `check-types`.

### F1.2 — UI root / canvas concept

**Goal:** a single well-defined origin and bounds that all UI is measured
against.

**Implementation detail:**

- Add `UiCanvasEcsComponent` (`uiCanvasId = createComponentId<...>('ui-canvas')`)
  in `src/ui/components/ui-canvas-component.ts`. Fields:
  - `width: number`, `height: number` — current logical size in CSS pixels.
  - `devicePixelRatio: number`.
  - `referenceResolution: Vector2` — design resolution used for scaling.
  - `scaleMode: 'constant-pixel' | 'scale-with-width' | 'scale-with-height' | 'match'`
    (start with `constant-pixel`; the others can be no-ops with a TODO if they
    over-scope this epic).
- The UI canvas is the **root entity** of a UI tree. UI elements descend from it
  via `ParentComponent`.
- Provide `createUiCanvas(world, options)` in
  `src/ui/utilities/create-ui-canvas.ts` that creates the entity, attaches
  `UiCanvasEcsComponent`, a `PositionEcsComponent` at the screen origin, and a
  `UiTransformEcsComponent` (F1.3) covering the full viewport.

**Coordinate model:** UI is **screen-space, top-left origin, +Y down, pixels**.
Document this explicitly because the game render space differs. The conversion
to the clip space the shader needs is handled by the UI projection in Epic 2;
this epic only fixes the convention.

### F1.3 — UI transform model (anchors, pivot, rotation, scale)

**Goal:** the core box model for UI elements.

**Implementation detail:**

- Add `UiTransformEcsComponent` in `src/ui/components/ui-transform-component.ts`
  with:
  - `anchorMin: Vector2`, `anchorMax: Vector2` — normalized (0–1) anchor rect
    within the parent's resolved rect (Unity-RectTransform style). Equal
    min/max = point anchor; spread = stretch.
  - `offsetMin: Vector2`, `offsetMax: Vector2` — pixel insets from the anchor
    rect to the element's edges. (With point anchors these encode size+position;
    with stretch anchors they encode margins.)
  - `pivot: Vector2` — normalized pivot for rotation/scale (default `(0.5,0.5)`).
  - `rotation: number` (radians), `scale: Vector2`.
  - Resolved output, written by the layout system, **not** by the user:
    `resolvedRect: Rect` (use [math/Rect.ts](../../src/math/Rect.ts)),
    `worldMatrix: Matrix3x3`.
- Provide ergonomic helpers in `src/ui/utilities/`:
  - `anchorPresets.ts` — named presets (`topLeft`, `center`, `stretchAll`,
    `bottomStretch`, …) returning `{ anchorMin, anchorMax, pivot }`.
  - `setUiRect(transform, { x, y, width, height })` — converts a simple
    pixel rect (relative to a point anchor) into `offsetMin/offsetMax`.

**Why Rect/Matrix3x3:** reuse [math](../../src/math/index.js); the renderer
already consumes `Matrix3x3` uniforms (see `Material.setUniform('u_projection',
…)`), so producing a `worldMatrix: Matrix3x3` keeps Epic 2 trivial.

### F1.4 — UI layout system (resolve pass)

**Goal:** turn anchors+offsets+hierarchy into `resolvedRect` + `worldMatrix`
every frame (or only when dirty).

**Implementation detail:**

- Add `createUiLayoutEcsSystem()` in
  `src/ui/systems/ui-layout-system.ts` implementing `EcsSystem`.
- It must process **parents before children**. The existing
  parent-position/transform systems already establish an ordering approach
  ([parent-position-system.ts](../../src/common/systems/parent-position-system.ts));
  mirror it. Drive off the UI canvas root and walk the hierarchy, or sort the
  query result by hierarchy depth into a reusable scratch buffer (allocate once
  at module scope, like `spriteEntityBuffer` in
  [render-system.ts](../../src/rendering/systems/render-system.ts)).
- For each element:
  1. Read parent `resolvedRect` (root uses the canvas rect).
  2. `anchorRect = lerp(parentRect, anchorMin..anchorMax)`.
  3. `resolvedRect = anchorRect inset by offsetMin/offsetMax`.
  4. Compose `worldMatrix` = parentWorld × translate(rect origin) ×
     translate(pivot) × rotate × scale × translate(-pivot).
- **Dirty flagging:** add an optional `isDirty`/`isStatic` flag to
  `UiTransformEcsComponent` mirroring `PositionEcsComponent.isStatic`, so static
  subtrees skip recomputation. Default to recompute-always for correctness; make
  static an opt-in optimization validated in Epic 9.

**Tests:** pure layout math is highly testable — assert resolved rects for
point anchors, stretch anchors, nested parents, pivots, and rotation. No GL
needed.

### F1.5 — Flex-style layout option (spike + conditional adoption)

**Goal:** evaluate a flex/auto-layout container and adopt it **only if it earns
its place** (per the roadmap's "if it proves to carry its weight").

**Implementation detail:**

- Add `UiFlexEcsComponent` (`direction: 'row' | 'column'`, `gap`,
  `justify: 'start'|'center'|'end'|'space-between'`, `align`, `padding`).
- In the layout system, when a parent has `UiFlexEcsComponent`, compute child
  `resolvedRect`s by flow instead of anchors (children with explicit anchors
  inside a flex parent are positioned by flow; document the precedence).
- Keep this **isolated** behind its own component so the anchor model (F1.3/F1.4)
  is fully usable without it. If the spike shows poor cost/benefit, ship the
  component as experimental and note it; do not block the epic on it.

**Decision gate:** record the adopt/defer decision in this file's changelog when
implemented.

### F1.6 — Resize handling

**Goal:** layout re-solves correctly when the game container or browser window
changes size.

**Implementation detail:**

- Add `src/ui/utilities/create-ui-resize-observer.ts` that wires a
  `ResizeObserver` on the render container (the same `HTMLElement` the
  `MouseInputSource` attaches to — see
  [mouse-input-source.ts](../../src/input/mouse/input-sources/mouse-input-source.ts),
  which caches `getBoundingClientRect()` and must be refreshed on resize too).
  On resize it updates `UiCanvasEcsComponent.width/height/devicePixelRatio` and
  marks the UI tree dirty.
- Emit a `ParameterizedForgeEvent<{ width; height }>` named
  `uiCanvasResized` (use
  [parameterized-forge-event.ts](../../src/events/parameterized-forge-event.ts))
  so other systems (and tests) can react. Epic 4's defocus/blur work and Epic 2's
  projection both subscribe.
- Provide a teardown function that disconnects the observer (avoid leaks across
  scene/world teardown — there is a `Stoppable` contract used elsewhere).
- Guard against resize storms by coalescing to one re-solve per frame (set a
  dirty flag; the layout system consumes it), rather than re-solving inside the
  observer callback.

**Tests:** simulate resize by mutating the canvas component and asserting the
layout system produces updated rects; assert the event fires once per coalesced
change.

---

## Cross-cutting (definition of done for this epic)

- Unit tests for layout math (anchors, offsets, nesting, pivot, rotation),
  flex flow (if adopted), and resize re-solve/coalescing.
- JSDoc on every public component interface, component id, system factory, and
  utility; a documentation guide "UI Layout & Anchors" with diagrams of the
  anchor/pivot model.
- A demo scene showing anchored elements re-laying-out on resize (it can render
  via Epic 2 once available; until then, a debug overlay drawing resolved rects
  is acceptable).
- All new symbols exported from `src/ui/index.ts`, `src/index.ts`, and the
  `package.json` `./ui` export.
- No direct DOM event handling inside components/systems except the single
  resize observer utility, which is explicitly an integration boundary.
