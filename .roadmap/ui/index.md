# Forge UI Stack — Roadmap

## Goal

Add a performant, robust, well-tested, and feature-rich UI stack to the Forge
game engine. The UI stack must be ECS-native, render through the existing
instanced WebGL2 pipeline, and integrate non-negotiably with the existing Forge
**events** (`ForgeEvent`, `EventDispatcher`) and **input** (`InputManager`,
input actions/bindings) systems. UI animations must be driven by the existing
property **animation** system rather than a bespoke tweening layer.

This document is a high-level plan only. It defines the epics, their scope, the
order in which they should be built (phases), and the cross-cutting concerns
that apply throughout. Epics will be decomposed into concrete features in a
later session — no decomposition, no code, and no new files are produced here.

## Guiding Principles

- **ECS-first.** UI elements are entities composed of components and processed
  by systems. There is no parallel retained-mode object graph that duplicates
  ECS state.
- **Reuse the engine.** Rendering goes through the existing material/shader and
  instanced-batch pipeline. Interaction goes through the existing input and
  event systems. Motion goes through the existing animation system.
- **Composition over inheritance.** Complex widgets are compositions of simpler
  ones (e.g. a button = panel + text). Where a widget is a composition, ship a
  utility/factory function that assembles the entity tree.
- **Sensible defaults, full escape hatches.** Every element has a sensible
  default shader exposing common options (tint, border, opacity, corner
  radius, etc.) and also accepts a fully custom shader/material for complex
  effects.
- **Robust state handling.** Focus, hover, press, disabled, and defocus
  behavior (element blur, game-container blur, browser-tab blur, window resize)
  are first-class concerns, not afterthoughts.
- **Tested and documented as we go.** Each epic ships with unit tests, a
  documentation guide, and a demo contribution. Testing and docs are not a
  final phase tacked on at the end.

## Cross-Cutting Requirements

These apply to **every** epic and are part of each epic's definition of done:

- **Unit tests** for all new logic (layout math, hit testing, focus traversal,
  state transitions, text shaping/metrics, etc.).
- **Documentation guides** under the documentation site explaining how each
  feature works, plus JSDoc on all public APIs for the generated API reference.
- **Demo coverage** in the documentation-site demo showcasing each feature.
- **Public API hygiene** — every new module/element is exported from its
  module `index.ts`, from `/src/index.ts`, and mapped in `package.json` exports
  where separately importable.
- **Events & input integration** — every interactive element emits Forge events
  and is driven by the Forge input system; no direct, un-abstracted DOM event
  handling inside widgets.

---

## Epics

### Epic 1 — UI Core & Layout Foundations

The foundational layer every other epic builds on.

- A UI root / canvas concept and screen-space coordinate model.
- Transform model for UI: **anchors, pivots, rotation, scale**, and (if it
  proves to carry its weight) a **flex**-style layout option.
- Parent/child layout propagation built on existing ECS entity hierarchy.
- Window/container **resize handling** — layout re-solves correctly when the
  game container or browser window changes size.
- Component/system scaffolding under `src/ui` (the `components`, `systems`,
  `shaders`, and `utilities` folders already exist and are empty).

### Epic 2 — UI Rendering & Default Shader/Material

The rendering contract shared by all elements.

- Render UI through the existing instanced batch pipeline (screen-space, draw
  order / z-ordering appropriate to UI).
- A **default UI shader** with customizable options: tint, border (color +
  width), opacity, corner radius, and similar common knobs.
- A clean path for elements to supply a **fully custom shader/material** for
  advanced effects.
- Masking/clipping primitive needed later by scroll groups.

### Epic 3 — SDF Text Rendering

Text is a prerequisite for buttons, inputs, dropdowns, and most widgets.

- **WebGL2 SDF (signed distance field) text rendering**.
- A **font-asset generation tool** to produce SDF atlases + metrics from font
  files, if a suitable asset is not already available.
- Text rendering options: **alignment, bold, italic**, color/tint, size, and
  wrapping/overflow behavior.
- Integration with the default-shader/custom-shader story from Epic 2.

### Epic 4 — Interaction, Focus & State Core

The shared interaction substrate for all interactive widgets.

- **Pointer hit-testing** wired through the Forge input system.
- **Element state model**: hover, pressed, focused, disabled, and transitions
  between them, emitted as Forge events.
- **Focus management** and sensible **defocus behavior** when the user
  defocuses the element, the game container, or the browser tab, or resizes the
  window.
- **Keyboard navigation**: tabbing and shift+tab traversal, arrow-key
  navigation, and configurable shortcuts — all via the Forge input system.

### Epic 5 — Primitive Widgets

The first round of user-facing elements, built on Epics 1–4.

- **Panels**
- **Buttons**
- **Checkboxes**
- **Sliders**

Each is interactive (where applicable), themeable via the default shader, focus-
and keyboard-navigable, and emits Forge events.

### Epic 6 — Composition Utilities

- Utility/factory functions that assemble **composed** widgets (e.g. a button =
  panel + text) into ready-to-use entity trees, so users don't hand-wire common
  compositions.
- Establish the conventions these factories follow so later widgets reuse them.

### Epic 7 — Advanced & Container Widgets

Higher-complexity elements that depend on text, masking, and focus.

- **Scroll groups / masks** (depends on Epic 2 clipping + Epic 4 focus).
- **Input boxes** (depends on Epic 3 text + Epic 4 focus/keyboard).
- **Dropdowns** (depends on panels, buttons, scrolling, and focus).

### Epic 8 — UI Animation Integration

- Drive UI motion (transitions, hover/press feedback, open/close, etc.) through
  the **existing property animation system** — no separate tween engine.
- Ship **examples, demos, and guides** for animating UI properties.

### Epic 9 — Performance, Stress Testing & Hardening

- A **stress-test demo** rendering hundreds of distinct UI elements on screen at
  once, used to validate batching and frame budget.
- Profiling pass and targeted optimizations informed by the stress test.
- Robustness pass over edge cases (rapid focus changes, resize storms,
  tab-blur/refocus, many simultaneous animations).

### Epic 10 — Documentation Site Demo & User Guides

- A consolidated **UI showcase demo** in the documentation site covering every
  UI feature.
- Complete **user guides** explaining how each feature works and how to compose
  them.
- Ensure the generated **API reference** is complete (JSDoc coverage).

> Note: Epics 9 and 10 consolidate cross-cutting concerns that are _also_
> delivered incrementally within each preceding epic. They exist to guarantee a
> holistic stress test, a unified showcase, and end-to-end guides once the full
> surface area is in place — not to defer testing or docs to the end.

---

## Phases (Build Order)

Phases are ordered by dependency. Within a phase, epics can largely proceed in
parallel. Cross-cutting requirements (tests, docs, demo, exports) are delivered
_inside_ each epic, not deferred.

### Phase 1 — Foundations

- **Epic 1 — UI Core & Layout Foundations**
- **Epic 2 — UI Rendering & Default Shader/Material**

Rationale: nothing can be rendered or laid out without these. They are the hard
prerequisites for every widget.

### Phase 2 — Text & Interaction Substrate

- **Epic 3 — SDF Text Rendering**
- **Epic 4 — Interaction, Focus & State Core**

Rationale: both build directly on Phase 1 and are prerequisites for usable
widgets. They are independent of each other and can be built concurrently.

### Phase 3 — Primitive Widgets & Composition

- **Epic 5 — Primitive Widgets**
- **Epic 6 — Composition Utilities**

Rationale: panels/buttons/checkboxes/sliders need layout, rendering, text, and
interaction (Phases 1–2). Composition utilities are defined alongside the first
composed widgets so conventions are set before the advanced widgets arrive.

### Phase 4 — Advanced Widgets

- **Epic 7 — Advanced & Container Widgets**

Rationale: scroll groups, input boxes, and dropdowns depend on clipping/masking,
text input, focus/keyboard navigation, and the primitive widgets/composition
utilities from earlier phases.

### Phase 5 — Animation, Performance & Documentation

- **Epic 8 — UI Animation Integration**
- **Epic 9 — Performance, Stress Testing & Hardening**
- **Epic 10 — Documentation Site Demo & User Guides**

Rationale: animation polish, the full-scale stress test, and the consolidated
showcase/guides are most valuable once the complete element set exists. Per-epic
tests, docs, and demos already exist by this point; this phase makes the whole
stack cohesive, fast, and fully documented.

---

## Definition of Done (for the overall UI stack)

- All listed elements (panels, buttons, checkboxes, sliders, scroll
  groups/masks, input boxes, dropdowns) implemented, themeable via the default
  shader, and overridable with custom shaders.
- SDF text rendering with alignment/bold/italic and an asset-generation tool.
- Anchors, pivots, rotation, scale (and flex if adopted) working with correct
  resize behavior.
- Full keyboard navigation (tab, shift+tab, arrows, shortcuts) and correct
  focus/defocus behavior across element/container/tab/window events.
- Integrated with Forge events and Forge input throughout.
- UI animations demonstrated through the existing property animation system.
- Unit tests across all features, a stress-test demo with hundreds of elements,
  a complete documentation-site demo, and user guides for every feature.
