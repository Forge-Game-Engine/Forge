# Epic 7 — Advanced & Container Widgets

Higher-complexity elements that depend on text, masking, and focus: **scroll
groups / masks**, **input boxes**, and **dropdowns**. Each is a composition of
earlier primitives plus new behavior, and each stresses a different prerequisite
(clipping, text editing, layered focus).

## Status

- **Phase:** 4 — Advanced Widgets
- **Depends on:** Epic 2 (clipping/masking), Epic 3 (text), Epic 4 (focus,
  keyboard, hit-testing), Epic 5 (panels/buttons/sliders), Epic 6 (composition
  utilities & teardown).
- **Blocks:** nothing structurally, but is the last functional epic before the
  polish phases (8–10).

---

## Features

### F7.1 — Scroll group / mask

**Goal:** a clipped, scrollable container for content larger than its viewport.

**Implementation detail:**

- `createUiScrollGroup(world, options)`: a **viewport** panel with
  `UiClipEcsComponent` (Epic 2 clipping) and a **content** child whose
  `UiTransformEcsComponent` offset is driven by scroll position. Content can
  exceed the viewport; clipping hides the overflow.
- `UiScrollEcsComponent { scroll: Vector2; contentSize: Vector2; viewportSize:
Vector2; orientation: 'vertical' | 'horizontal' | 'both'; onScroll }`.
- `createUiScrollEcsSystem(inputManager)`:
  - **Wheel:** consume wheel input via the mouse source's axis binding (the
    `MouseInputSource` already handles `wheel` →
    [mouse-axis1d/axis2d bindings](../../src/input/mouse/bindings/)); when the
    pointer is over the viewport (Epic 4 hit-test), adjust `scroll`, clamped to
    `[0, contentSize - viewportSize]`.
  - **Drag/touch:** optional drag-to-scroll using press state + pointer delta.
  - **Keyboard:** when a child is focused, ensure-visible by adjusting `scroll`
    so the focused element's `resolvedRect` enters the viewport (ties scrolling
    to Epic 4 focus — important for accessibility and dropdowns).
  - Apply `scroll` by writing the content element's offset; the layout system
    (Epic 1) re-solves children, the clip (Epic 2) hides overflow.
- **Optional scrollbars:** thin panels acting like sliders (reuse Epic 5 slider
  internals) bound to `scroll`. Keep optional/themeable.
- Performance note for Epic 9: clipped-but-offscreen children still cost layout +
  instance packing; consider culling fully-clipped children from the UI batch
  (skip pushing instances whose `resolvedRect ∩ clipRect` is empty).

### F7.2 — Input box (text field)

**Goal:** single-line (and optionally multi-line) editable text, the most
input-intensive widget.

**Implementation detail:**

- `createUiInputBox(world, options)`: a panel (interactable + focusable + state)
  containing a `UiText` (Epic 3) for the value, a **caret** child (a thin
  panel/quad), and an optional **selection highlight** child (a panel behind the
  text). Clip the text to the panel (Epic 2) so long values don't overflow.
- `UiInputEcsComponent { value; caretIndex; selectionAnchor; placeholder;
masked?: boolean; maxLength?; multiline?: boolean; onChange; onSubmit; onFocus;
onBlur }`.
- **Text input integration:** keystrokes must flow through the Forge input
  system, not a raw widget listener. Two viable paths — pick and document one:
  1. extend the keyboard source with a **text-composition input source** that
     surfaces character input (handles IME/`beforeinput`) as a Forge input
     stream the input box consumes; **or**
  2. add a focused, off-screen/transparent `<input>`/`contenteditable` element
     managed by a single sanctioned utility (like the resize/blur observers) that
     captures composition/IME correctly and feeds an input action.
     Path 2 is pragmatic for correct IME/clipboard support; keep the DOM element
     strictly behind a utility boundary, never inside the widget logic.
- **Editing logic (pure, testable):** caret movement (arrows, Home/End, word
  jumps), selection (shift+arrows), insert/delete/backspace, clipboard
  cut/copy/paste, `maxLength`, masking for passwords. Implement as a pure
  `applyEditCommand(state, command)` reducer so it unit-tests with no DOM/GL.
- Use Epic 4 actions for editing commands where they are key-driven
  (`ui.cancel` blurs, `ui.activate`/Enter submits) and the active input group so
  typing doesn't leak into gameplay.
- Caret blink and focus transitions are animated via Epic 8.

### F7.3 — Dropdown / select

**Goal:** a button that opens a scrollable, focus-trapped list of options.

**Implementation detail:**

- `createUiDropdown(world, options)` composes: a **trigger button** (Epic 5
  button showing the current selection) and a **popup** = a panel + scroll group
  (F7.1) + a list of option buttons (Epic 5).
- `UiDropdownEcsComponent { options; selectedIndex; isOpen; onChange; onOpen;
onClose }`.
- **Open/close:** trigger click or `ui.activate` toggles `isOpen`; building/
  showing the popup. The popup must render **above** other UI — set a high
  z-index/late draw order (Epic 2) or parent it to an "overlay" layer on the UI
  canvas root so it isn't clipped by ancestors.
- **Focus trap & keyboard:** while open, capture focus in the list; arrow keys
  move the highlighted option (Epic 4 spatial/tab nav scoped to the popup),
  Enter selects + closes, Escape (`ui.cancel`) closes without changing. On close,
  return focus to the trigger (Epic 4 `setFocus`).
- **Dismissal:** click-away and container/tab blur (Epic 4 blur policy) close the
  popup. Reuse the scroll group's "ensure focused option visible" behavior for
  long lists.
- Selecting updates the trigger label (Epic 3 text) and raises `onChange`.

---

## Cross-cutting (definition of done)

- Unit tests for: scroll clamping + ensure-visible math; the full input-box edit
  reducer (caret/selection/insert/delete/clipboard/maxLength/mask) and an IME/
  composition smoke test; dropdown open/close/select state and focus-return.
- Documentation guides per widget (usage, options, events, keyboard, theming) +
  JSDoc on all public APIs; explicitly document the chosen text-input
  integration path and its IME/clipboard support.
- Demo: a settings-style form combining a scroll group, several input boxes, and
  a dropdown, fully keyboard-operable.
- Exports updated in `src/ui/index.ts`, `src/index.ts`, `package.json`.
