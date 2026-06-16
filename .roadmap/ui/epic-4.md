# Epic 4 — Interaction, Focus & State Core

The shared interaction substrate every interactive widget depends on. It wires
**pointer hit-testing through the Forge input system**, defines the **element
state model** (hover/press/focus/disabled) emitted as **Forge events**, manages
**focus and defocus/blur** behavior, and provides **keyboard navigation** (tab,
shift+tab, arrows, shortcuts) — all via the Forge input system, with **no raw
DOM handlers inside widgets**.

## Status

- **Phase:** 2 — Text & Interaction Substrate
- **Depends on:** Epic 1 (UI transform/`resolvedRect`/hierarchy, resize event),
  Epic 2 (draw order / z-index for hit priority), the
  [input](../../src/input/) module (`InputManager`, actions, bindings, sources;
  mouse source already tracks pointer position and container rect), and
  [events](../../src/events/).
- **Independent of:** Epic 3 (concurrent).
- **Blocks:** Epics 5 and 7 (all interactive widgets).

## Architectural notes

- The input layer is **action/binding/source**. The
  [MouseInputSource](../../src/input/mouse/input-sources/mouse-input-source.ts)
  already listens to `mousedown/up/move/wheel` on the container and exposes
  pointer position via axis bindings; it caches `getBoundingClientRect()` (which
  Epic 1's resize work must refresh). Hit-testing should **consume input through
  this layer**, not add new DOM listeners in widgets.
- State lives in components; transitions are produced by systems and broadcast
  via `ParameterizedForgeEvent`
  ([parameterized-forge-event.ts](../../src/events/parameterized-forge-event.ts)).

---

## Features

### F4.1 — Interactable component & pointer hit-testing

**Goal:** know which UI element is under the pointer each frame, respecting
z-order and clipping.

**Implementation detail:**
- Add `UiInteractableEcsComponent` (`interactableId`): `{ enabled: boolean;
  blocksPointer: boolean; hitPadding?: number }`. Only entities with this
  component participate in hit-testing.
- Add `createUiHitTestEcsSystem(inputManager, renderContext)`:
  - Read the current pointer position from the mouse source/axis action and
    convert container-relative CSS pixels → UI screen space (the same top-left
    pixel space Epic 1 defines; account for `devicePixelRatio`).
  - Test against each interactable's `resolvedRect` (transformed by
    `worldMatrix`; for rotated elements test in the element's local space by
    applying the inverse). Respect the propagated `clipRect` from Epic 2 — a
    point outside the clip rect is not a hit.
  - Resolve overlaps by **z-index / draw order** (topmost wins) reusing Epic 2's
    ordering, then stop at the first `blocksPointer` element.
  - Write the result into a `UiPointerStateEcsComponent` on the UI canvas root:
    `{ hovered: entity | null; pressed: entity | null; pointer: Vector2 }`.
- Keep the math pure where possible (`pointInRect`, `worldToLocal`) so it is unit
  testable without GL or DOM.

### F4.2 — Element state model (hover / press / focus / disabled)

**Goal:** a single, well-defined state machine per interactive element with
Forge-event transitions.

**Implementation detail:**
- Add `UiStateEcsComponent` (`stateId`): boolean/flags for `hovered`, `pressed`,
  `focused`, `disabled` plus the per-element event objects:
  `onHoverEnter`, `onHoverExit`, `onPressStart`, `onPressEnd`, `onClick`,
  `onFocus`, `onBlur`, `onDisabledChange` — each a
  `ParameterizedForgeEvent<UiInteractionEvent>` where `UiInteractionEvent`
  carries `{ entity; pointer; source: 'pointer' | 'keyboard' }`.
- Add `createUiStateEcsSystem(inputManager)` that derives transitions from the
  pointer state (F4.1) and a press action (a `TriggerAction`/`HoldAction` bound
  to the mouse primary button, fetched via `inputManager.getTriggerAction(...)`):
  - hover enter/exit when `hovered` identity changes;
  - press start on button-down over the hovered element; press end on button-up;
    `onClick` only if press-up lands on the same element press began on;
  - `disabled` short-circuits all of the above (a disabled element never hovers/
    presses/focuses).
- Consider modeling the per-element transitions with the existing
  [finite-state-machine](../../src/finite-state-machine/) module to avoid ad-hoc
  boolean soup, if it fits cleanly; otherwise keep explicit, well-tested
  transition functions. Record the choice.

### F4.3 — Focus management

**Goal:** exactly one focused element (per UI root), with programmatic and
input-driven focus changes.

**Implementation detail:**
- Track focus centrally in `UiFocusEcsComponent` on the UI canvas root:
  `{ focused: entity | null; focusRing: boolean }`.
- Add `setFocus(world, root, entity | null)` utility that updates the central
  record, toggles the element `focused` flags, and raises `onBlur`/`onFocus`
  events. Pointer-press on a focusable element calls `setFocus` (source:
  `'pointer'`); keyboard nav (F4.5) calls it with source `'keyboard'`.
- Add `UiFocusableEcsComponent` (`{ tabIndex: number; focusable: boolean }`) to
  mark participants and order them (F4.5).
- Render concern (handed to Epics 5/8): a focus ring is just a style/state the
  default shader can show; this epic only owns the focus **state + events**.

### F4.4 — Defocus / blur behavior (element, container, tab, resize)

**Goal:** robust, first-class behavior when focus context is lost — explicitly
called out by the roadmap.

**Implementation detail:**
- Add `src/ui/utilities/create-ui-blur-observer.ts` (the one sanctioned DOM
  integration point) that listens at the **container/window/document** level for:
  - container `blur`/`focusout`, `window` `blur`, and `document`
    `visibilitychange` (tab switch) → raise a `uiContextBlurred` event and apply
    the configured policy (e.g. clear `pressed`/`hovered`, optionally clear or
    retain `focused`).
  - `mouseleave` on the container → clear hover/press (pointer left the canvas).
  - the `uiCanvasResized` event from Epic 1 → optionally clear pressed/hover and
    re-run hit-testing so stale hover under a moved element doesn't persist.
- Make the policy configurable via an options object with sensible defaults
  (`defaultUiBlurPolicy`): e.g. tab-blur keeps focus but clears press; container
  click-away blurs focus. Document the matrix of (event × what it clears).
- Provide teardown to remove all listeners (`Stoppable`), preventing leaks across
  world/scene teardown.

### F4.5 — Keyboard navigation (tab, shift+tab, arrows, shortcuts)

**Goal:** full keyboard operability, driven through Forge input actions.

**Implementation detail:**
- Define input **actions** (not raw key listeners): `ui.focusNext`,
  `ui.focusPrev`, `ui.navigateUp/Down/Left/Right`, `ui.activate` (Enter/Space),
  `ui.cancel` (Escape). Register them as `TriggerAction`s and provide default
  keyboard bindings via the keyboard source
  ([keyboard bindings](../../src/input/keyboard/bindings/)); expose a helper
  `registerUiInputActions(inputManager)` so apps wire them in one call (compare
  [register-inputs.ts](../../src/input/register-inputs.ts)).
- Put UI navigation in its own **input group** (the `InputManager` has
  `setActiveGroup`/`activeGroup`) so UI nav can be enabled/disabled without
  touching gameplay bindings — important so Tab doesn't move focus mid-gameplay.
- `createUiKeyboardNavEcsSystem(inputManager)`:
  - **Tab order:** build the ordered focusable list from
    `UiFocusableEcsComponent.tabIndex` (ties broken by hierarchy/draw order);
    `focusNext`/`focusPrev` move through it with wraparound, calling `setFocus`.
  - **Arrow/spatial nav:** optional 2D nearest-neighbor using `resolvedRect`
    centers (configurable per container; default to tab order if absent).
  - **Activate/cancel:** `ui.activate` fires `onClick`/`onPressStart+End` on the
    focused element (source `'keyboard'`); `ui.cancel` blurs or closes (used by
    dropdowns/inputs in Epic 7).
  - **Shortcuts:** allow elements to register a shortcut action → handler;
    dispatch when their input group is active.

---

## Cross-cutting (definition of done)

- Unit tests for: point-in-rect / world-to-local hit math, z-order/clip
  resolution, full state-machine transition table (incl. disabled short-circuit
  and press-cancel when pointer leaves), tab/shift-tab traversal with wrap,
  spatial nav nearest-neighbor, and the blur policy matrix (mock the events).
- Documentation guides: "UI interaction & events", "Focus & keyboard
  navigation", "Defocus/blur behavior"; JSDoc on all public APIs and on every
  emitted event's payload.
- Demo: a focusable grid of dummy elements showing hover/press/focus states,
  tab/arrow traversal, and a visible "context blurred" indicator when the tab
  loses focus.
- Exports updated in `src/ui/index.ts`, `src/index.ts`, `package.json`.
- **No DOM event handlers inside widgets** — only the two sanctioned observer
  utilities (resize in Epic 1, blur here) touch the DOM; everything else flows
  through `InputManager` actions.
