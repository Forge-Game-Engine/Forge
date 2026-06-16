# Epic 6 — Composition Utilities

Utility/factory functions that assemble **composed** widgets (e.g. button =
panel + text) into ready-to-use entity trees, so users don't hand-wire common
compositions — and the **conventions** those factories follow, so every later
widget reuses them. This epic is small but load-bearing: it standardizes how the
whole UI stack is authored.

## Status

- **Phase:** 3 — Primitive Widgets & Composition
- **Depends on:** Epic 1 (transform/hierarchy via `ParentComponent`), Epic 2
  (renderables), Epic 3 (text), Epic 4 (interaction), and is co-developed with
  Epic 5 (its first real consumers).
- **Blocks:** Epic 7 (advanced widgets are compositions of primitives).

## Architectural notes

- The ECS is data-oriented and entities are plain numbers. A "widget" is an
  **entity subtree** plus a bag of component references. Composition utilities
  therefore need a consistent way to (a) create a subtree, (b) hand back typed
  handles to its parts and events, and (c) tear it down cleanly. There is no
  retained-object graph — the entity tree *is* the widget.

---

## Features

### F6.1 — Factory return-shape & naming convention

**Goal:** one predictable shape for every `createUiX` factory.

**Implementation detail:**
- Standardize the return as a typed `UiWidgetHandle<TParts, TEvents>`:
  `{ entity: number; parts: TParts; events: TEvents; destroy(): void }` where
  `parts` exposes child entity ids/handles (e.g. `{ label, knob, fill }`) and
  `events` exposes the widget's `ParameterizedForgeEvent`s.
- Naming: `createUi<Widget>(world, options)`; options objects follow the
  project's defaults convention (`defaultUi<Widget>Options`) from AGENTS.md.
- Retrofit Epic 5's button/checkbox/slider to this shape (they are developed
  together, so this is mostly defining the type and applying it).

### F6.2 — Subtree builder helpers

**Goal:** remove boilerplate of creating an entity, attaching transform/parent,
and registering components.

**Implementation detail:**
- Add `createUiElement(world, { parent, transform, style?, interactable?,
  focusable?, text? })` in `src/ui/utilities/` — a single helper that creates an
  entity, attaches `UiTransformEcsComponent`, sets `ParentComponent` to `parent`,
  and conditionally attaches renderable/interactable/focusable/text components.
  Most factories become a few `createUiElement` calls plus wiring.
- Add `addUiChild(world, parent, child)` / `setUiParent(world, child, parent)`
  thin wrappers over `ParentComponent` so factories never poke parent internals
  directly, and so reparenting (used by dropdown popups in Epic 7) is one call.

### F6.3 — Lifecycle & teardown

**Goal:** composed widgets clean up their whole subtree and their event
listeners — critical for the robustness pass in Epic 9.

**Implementation detail:**
- `destroyUiSubtree(world, entity)` recursively removes children (walk
  `ParentComponent` relationships) then the root, calling `removeEntity`/
  `removeComponent` on the [EcsWorld](../../src/ecs/ecs-world.ts). The factory's
  `handle.destroy()` delegates here and additionally `clear()`s any
  `ParameterizedForgeEvent`s the widget owns, and deregisters any input
  actions/observers it created (Epic 4 blur observers, slider drag systems).
- Document that **listeners must be deregistered**: `ParameterizedForgeEvent`
  retains listeners until `deregisterListener`/`clear` (see
  [parameterized-forge-event.ts](../../src/events/parameterized-forge-event.ts));
  un-torn-down widgets leak.

### F6.4 — Theming / style presets for compositions

**Goal:** consistent look across composed widgets without copy-pasting style
numbers.

**Implementation detail:**
- Add a `UiTheme` object (colors, border widths, corner radius, font, per-state
  tints) and `defaultUiTheme`. Factories read style defaults from a theme passed
  via options (or a world-level default theme component on the UI canvas root).
- Provide `mergeUiStyle(theme, overrides)` so per-widget overrides layer over the
  theme using the project's `{ ...defaults, ...options }` convention.
- This makes Epic 8's animated state transitions theme-aware (animate *toward*
  theme-defined target styles).

### F6.5 — Composition conventions doc (the contract for later widgets)

**Goal:** write down the rules so Epic 7 and any future widget comply.

**Implementation detail:**
- A short "Authoring composed widgets" guide capturing: factory signature/return
  shape (F6.1), use of `createUiElement`/parenting helpers (F6.2), mandatory
  `destroy()` + listener cleanup (F6.3), theme usage (F6.4), and the rule that
  interaction/rendering/animation always go through the Epic 2/4/8 substrate
  (never bespoke).
- Include a worked example reconstructing the button from primitives to make the
  pattern concrete.

---

## Cross-cutting (definition of done)

- Unit tests for: subtree creation/parenting via `createUiElement`,
  `destroyUiSubtree` fully removing components and clearing event listeners
  (assert no dangling listeners), and `mergeUiStyle`/theme merging.
- Documentation: the "Authoring composed widgets" guide (F6.5) + JSDoc on every
  helper and the `UiWidgetHandle`/`UiTheme` types.
- Demo: a small "build your own widget" example composing a labeled icon button
  from primitives using only the composition utilities.
- Exports updated in `src/ui/index.ts`, `src/index.ts`, `package.json`.
