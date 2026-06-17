# Epic 2 — UI Rendering & Default Shader/Material

The rendering contract shared by all UI elements. UI must render through the
**existing instanced batch pipeline** — no parallel renderer — in screen space
with UI-appropriate draw ordering, expose a featureful **default UI shader**,
allow a **fully custom material** escape hatch, and provide a **masking/clipping**
primitive that Epic 7's scroll groups need.

## Status

- **Phase:** 1 — Foundations
- **Depends on:** Epic 1 (UI transform/`worldMatrix`, UI canvas, resize), the
  existing rendering stack: [Renderable](../../src/rendering/renderable.ts),
  [Material](../../src/rendering/materials/material.ts),
  [InstanceBatch](../../src/rendering/systems/instance-batch.ts),
  [render-system.ts](../../src/rendering/systems/render-system.ts),
  `createProjectionMatrix`.
- **Blocks:** all visual epics (3, 5, 7), and clipping is a hard prerequisite for
  Epic 7 scroll groups.

## Architectural notes

- The render system batches by `Renderable` instance: it groups entities sharing
  a `Renderable` into an `InstanceBatch`, grows a `Float32Array`, calls
  `renderable.bindInstanceData(components, buffer, offset)` per entity, uploads
  once, and `drawArraysInstanced`. A UI element is therefore an entity with a
  component pointing at a `Renderable` — exactly like
  [sprite-component.ts](../../src/rendering/components/sprite-component.ts).
- `Material` auto-detects uniforms and supports `number | boolean | Float32Array
| Int32Array | WebGLTexture | Vector2 | Matrix3x3` and `setColorUniform`. The
  default UI shader's "global" knobs (not per-instance) are plain uniforms;
  per-element knobs (tint, corner radius, etc.) must travel as **per-instance
  attributes** in the instance buffer.

---

## Features

### F2.1 — UI render component & UI `Renderable` factory

**Goal:** the UI analogue of `SpriteEcsComponent` + a quad `Renderable` wired for
the default UI shader.

**Implementation detail:**

- Add `UiRenderableEcsComponent` in
  `src/ui/components/ui-renderable-component.ts`:
  `renderable: Renderable`, `enabled: boolean`, plus the per-instance style
  fields consumed by the default shader (F2.2): `tintColor: Color`,
  `borderColor: Color`, `borderWidth: number`, `opacity: number`,
  `cornerRadius: number` (or a `Vector4` for per-corner), and a `clipRect`
  reference (F2.5).
- Add `createUiRenderable(renderContext, options)` in
  `src/ui/utilities/create-ui-renderable.ts` that builds a `Renderable` using
  the shared UI quad geometry, the default UI `Material`, a chosen `layer`, a
  `floatsPerInstance` count, and `bindInstanceData` / `setupInstanceAttributes`
  callbacks (F2.3). Model it on how sprites construct their `Renderable`.

### F2.2 — Default UI shader/material

**Goal:** a single shader covering the common UI look so most elements need no
custom GLSL.

**Implementation detail:**

- Add `src/ui/shaders/ui/ui.vert.glsl` and `ui.frag.glsl`, plus a barrel/loader
  in `src/ui/shaders/index.ts`, following the existing shader module layout
  ([src/rendering/shaders](../../src/rendering/shaders/)) and the `.glsl` copy
  step in the build (shaders are copied to `dist`).
- **Vertex shader:** transform the unit quad by the per-instance `worldMatrix`
  (Epic 1 output) and the UI projection (F2.4); pass local UV (0–1) and
  per-instance style varyings to the fragment shader.
- **Fragment shader knobs** (per-instance unless noted):
  - `tint` (rgba), `opacity` (multiplies alpha).
  - `borderColor` + `borderWidth` (px, converted to UV using the element's
    pixel size).
  - `cornerRadius` via an SDF rounded-box (reuse/extend any existing SDF helpers
    under [shaders/lib](../../src/rendering/shaders/lib/) or
    [shaders/utils](../../src/rendering/shaders/utils/)); antialias the edge with
    `fwidth`.
  - optional `backgroundTexture` sampler with `uvOffset`/`uvScale` for textured
    panels (uniform/sampler, bound like sprites bind their atlas).
  - clip test against `clipRect` (F2.5).
- Provide a typed options object + defaults (`defaultUiStyleOptions`) following
  the project's "defaults live in a `default…` object" convention from AGENTS.md.

### F2.3 — Per-instance attribute packing for UI style

**Goal:** stream per-element style through the instance buffer so differently
styled elements still batch together.

**Implementation detail:**

- Decide the instance layout and set `floatsPerInstance` accordingly. Suggested
  packing per instance: `mat3 worldMatrix` (9 floats — or pass 6 for a 2D affine
  to save space), `vec2 size`, `vec4 tint`, `vec4 borderColor`, `float
borderWidth`, `float cornerRadius`, `float opacity`, `vec4 clipRect`.
- Implement `bindInstanceData(components, buffer, offset)` to write these in a
  fixed order; implement `setupInstanceAttributes(gl, renderable)` to declare
  matching `vertexAttribPointer` + `vertexAttribDivisor(…, 1)` calls. Use
  `gl.getAttribLocation(renderable.material.program, …)` exactly as the sprite
  path does.
- Document the layout in a comment block adjacent to both callbacks so they
  cannot drift out of sync (a single source-of-truth `const UI_INSTANCE_LAYOUT`
  describing names+sizes+offsets is ideal, and lets a unit test assert the total
  equals `floatsPerInstance`).

### F2.4 — UI render system, projection & draw order

**Goal:** a render system that draws UI in screen space, after the game, in a
deterministic order.

**Implementation detail:**

- Add `createUiRenderEcsSystem(renderContext)` in
  `src/ui/systems/ui-render-system.ts`, structurally mirroring
  [render-system.ts](../../src/rendering/systems/render-system.ts): a module
  scratch buffer for UI entities, a `Map<Renderable, InstanceBatch>`, clear
  batches each frame, push resolved instances, then `includeBatch` per
  renderable.
- **Projection:** UI uses a fixed screen-space orthographic projection (top-left
  origin, pixel units, +Y down), built from `gl.canvas.width/height`. Either add
  a `createUiProjectionMatrix(width, height)` helper next to the existing
  `createProjectionMatrix`, or reuse a camera at a fixed transform. Set it as the
  `u_projection` uniform (the existing `includeBatch` already sets
  `u_projection`).
- **Draw order:** UI must render **after** the game render system. Register it
  with a later order — `SystemRegistrationOrder.late` from
  [ecs-system.ts](../../src/ecs/ecs-system.ts) — and within UI, order by a
  `zIndex`/draw-order field (sort the entity scratch buffer by `zIndex`, then by
  hierarchy order) so overlapping panels stack predictably. Note: sorting splits
  batches, so keep z-index coarse (per layer/window) rather than per element to
  preserve batching; validate the tradeoff in Epic 9.
- Configure blending consistent with the sprite path
  (`SRC_ALPHA, ONE_MINUS_SRC_ALPHA`) and ensure UI does not write/depend on depth
  in a way that fights the game pass.

### F2.5 — Masking / clipping primitive

**Goal:** rectangular clip regions that constrain child rendering — the
prerequisite for Epic 7 scroll groups, and useful for any panel with overflow.

**Implementation detail:**

- **Phase A (rectangular scissor/analytic clip):** add `UiClipEcsComponent`
  marking an element as a clip region. The layout system already produces a
  `resolvedRect`; propagate the **intersection** of ancestor clip rects down the
  tree (compute during the F1.4 resolve pass and store on each element as
  `clipRect`). The default shader (F2.2) discards fragments outside `clipRect`.
  This handles axis-aligned clipping with zero extra draw calls and batches
  cleanly.
- **Phase B (optional, deferred unless needed):** for rotated/non-rect masks,
  add a stencil-buffer path. Keep it out of scope unless Epic 7 demands it;
  rectangular analytic clipping covers scroll groups.
- Provide `createUiClip(world, entity, options)` helper and document the nesting
  semantics (clip rects always intersect, never union).

### F2.6 — Custom material / shader escape hatch

**Goal:** let an element opt out of the default shader entirely for advanced
effects, without leaving the batch pipeline.

**Implementation detail:**

- Because batching keys on the `Renderable`, a custom material is just a custom
  `Renderable`: expose `createCustomUiRenderable({ vertexSource, fragmentSource,
floatsPerInstance, bindInstanceData, setupInstanceAttributes, layer })` that
  builds a `Material` from the user's GLSL and returns a `Renderable` the UI
  render system batches like any other.
- Document the **contract** the custom shader must honor to coexist with the UI
  render system: it receives `u_projection`, must apply the per-instance
  `worldMatrix`, and (if it wants clipping) must implement the `clipRect`
  discard. Provide the default shader source as a copy-paste starting point.

---

## Cross-cutting (definition of done)

- Unit tests for: instance-layout total == `floatsPerInstance`; projection maps
  screen corners to expected clip coords; clip-rect intersection math down a
  nested tree; draw-order sorting. GL-heavy paths use the existing
  `RenderContext` test patterns ([render-context.test.ts](../../src/rendering/render-context.test.ts)).
- Documentation guide "Styling UI with the default shader" (every knob with a
  visual) and "Custom UI materials"; JSDoc on all public APIs.
- Demo: a panel gallery showing tint/border/opacity/corner-radius, a textured
  panel, a clipped region, and one custom-shader panel.
- Exports updated in `src/ui/index.ts`, `src/index.ts`, `package.json`.
