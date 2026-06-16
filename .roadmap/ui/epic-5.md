# Epic 5 — Primitive Widgets

The first round of user-facing elements — **panels, buttons, checkboxes,
sliders** — built entirely on Epics 1–4. Each is interactive where applicable,
themeable through the default shader, focus- and keyboard-navigable, and emits
Forge events. No widget introduces its own renderer, input listener, or tween
engine; they compose the substrate.

## Status

- **Phase:** 3 — Primitive Widgets & Composition
- **Depends on:** Epic 1 (transform/layout), Epic 2 (default shader, clipping),
  Epic 3 (text for labels), Epic 4 (hit-testing, state, focus, keyboard).
- **Sibling:** Epic 6 (composition utilities) — built alongside so the factory
  conventions are shared (button = panel + text is the first composed widget).
- **Blocks:** Epic 7 (advanced widgets reuse these).

## Cross-widget conventions

- Each widget = an **entity tree**: a root with `UiTransformEcsComponent` +
  `UiRenderableEcsComponent` (Epic 2) + interaction components (Epic 4) +
  optional children (e.g. a text label entity, a knob entity).
- Each ships a **factory** `createX(world, options): { entity, …handles }`
  returning the root id plus references to sub-entities and the widget's event
  objects — the convention Epic 6 formalizes.
- Visual state (hover/press/focus/disabled) maps to **default-shader style
  deltas** (tint/border/opacity). Keep a small `applyUiStateStyle` helper that
  maps `UiStateEcsComponent` → style fields so all widgets are consistent; later
  these deltas are animated by Epic 8 rather than snapped.
- Every interactive widget exposes typed Forge events and is reachable by Tab
  (`UiFocusableEcsComponent`) and operable by `ui.activate`.

---

## Features

### F5.1 — Panel

**Goal:** the base container/surface; also the visual building block for other
widgets.

**Implementation detail:**
- `createUiPanel(world, options)` builds an entity with UI transform + UI
  renderable using the default shader (tint, border, corner radius, opacity,
  optional background texture from Epic 2).
- Options: anchors/rect (Epic 1 helpers), style knobs, optional `clip: boolean`
  (attaches `UiClipEcsComponent` from Epic 2 so children are clipped — the basis
  for scroll groups in Epic 7), optional `interactable`/`focusable` for panels
  used as buttons/regions.
- Panels are the natural **parent** for composed widgets; ensure parenting via
  `ParentComponent` is a first-class option.

### F5.2 — Button

**Goal:** the canonical composed, interactive widget (panel + text label).

**Implementation detail:**
- `createUiButton(world, options)` assembles: a panel root (interactable +
  focusable + state) and a child `UiText` (Epic 3) centered via layout. This is
  the first consumer of Epic 6's composition convention.
- Wire Epic 4: the root's `UiStateEcsComponent.onClick` is re-exposed as the
  button's `onClick`; `ui.activate` (keyboard) triggers it too.
- Visual states via `applyUiStateStyle`: hover tint, pressed inset/darken,
  focus ring (border), disabled desaturate + `blocksPointer = false` semantics so
  disabled buttons don't intercept hover.
- Options: `label`, `onClick`, style overrides per state, `disabled`, optional
  `icon` (a child renderable), `toggle` mode (latching pressed state) if cheap.

### F5.3 — Checkbox

**Goal:** a binary toggle with clear state + events.

**Implementation detail:**
- `createUiCheckbox(world, options)`: a panel "box" (interactable + focusable +
  state) plus a "check" child (a glyph from a text/icon atlas, or a small
  renderable) whose visibility/opacity reflects `checked`.
- Maintain `UiCheckboxEcsComponent { checked: boolean; onChange:
  ParameterizedForgeEvent<{ entity; checked }> }`. Pointer click and
  `ui.activate` both toggle `checked` and raise `onChange`.
- Optional `indeterminate` tri-state and an optional adjacent label entity
  (clicking the label toggles the box — reuse the same interactable wiring).
- Visual states reuse `applyUiStateStyle`; the check appearance can later be
  animated (Epic 8) — keep the toggle a single style/opacity field so animation
  is a drop-in.

### F5.4 — Slider

**Goal:** a continuous (or stepped) value control — the most input-heavy
primitive.

**Implementation detail:**
- `createUiSlider(world, options)` assembles a **track** panel, a **fill** panel
  (clipped/sized to value), and a **knob** panel (interactable + focusable +
  state). Layout positions the knob along the track from the normalized value.
- `UiSliderEcsComponent { value; min; max; step?; orientation: 'horizontal' |
  'vertical'; onChange; onChangeStart; onChangeEnd }`.
- `createUiSliderEcsSystem(inputManager)`:
  - **Drag:** on knob press (Epic 4 press state) read pointer position each
    frame, project onto the track axis using the knob/track `resolvedRect`s,
    clamp with [math/clamp.ts](../../src/math/clamp.ts), snap to `step`, update
    `value`, reposition knob, resize fill, raise `onChange`.
  - **Track click:** clicking the track jumps the value (and optionally begins a
    drag).
  - **Keyboard:** when focused, `ui.navigate*`/arrow actions adjust by `step`
    (Home/End to min/max via extra actions); raise `onChange`.
- Emit `onChangeStart`/`onChangeEnd` around a drag/keyboard interaction so
  consumers can throttle expensive work — and so Epic 8 can animate the knob to
  snapped positions.

---

## Cross-cutting (definition of done)

- Unit tests for: value math (normalize/clamp/step/orientation mapping for the
  slider), checkbox/toggle transitions, button click-vs-cancel via the Epic 4
  state machine, and keyboard activation of each widget. Layout-dependent
  positioning (knob/fill) tested through the layout system with known rects.
- Documentation guide per widget (usage, options, events, theming, keyboard) +
  JSDoc on every factory, component, and event.
- Demo: an interactive panel containing one of each widget, wired to visible
  output (e.g. slider drives a value label, checkbox toggles a panel).
- Exports updated in `src/ui/index.ts`, `src/index.ts`, `package.json`.
