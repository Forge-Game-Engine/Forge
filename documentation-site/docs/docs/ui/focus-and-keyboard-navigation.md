---
sidebar_position: 7
---

# Focus and Keyboard Navigation

Keyboard users move between UI elements with a single shared focus tracker
per canvas ([`UiFocusEcsComponent`](/Forge/docs/api/interfaces/UiFocusEcsComponent))
and [`createUiKeyboardNavEcsSystem`](/Forge/docs/api/functions/createUiKeyboardNavEcsSystem),
which reads the `ui.*` input actions registered by
[`registerUiInputActions`](/Forge/docs/api/functions/registerUiInputActions)
and moves focus, activates the focused element, or clears focus.

```ts
import {
  registerUiInputActions,
  createUiKeyboardNavEcsSystem,
  uiFocusId,
} from '@forge-game-engine/forge/ui';
import { KeyboardInputSource } from '@forge-game-engine/forge/input';

const keyboardSource = new KeyboardInputSource(inputManager);
registerUiInputActions(inputManager, { mouseSource, keyboardSource });

world.addComponent(canvasEntity, uiFocusId, { focused: null, focusRing: false });
world.addSystem(createUiKeyboardNavEcsSystem(inputManager));
```

Passing a `KeyboardInputSource` to `registerUiInputActions` is what wires
the default key bindings (Tab, Shift, arrows, Enter, Space, Escape); omit
it and the actions still exist but nothing triggers them, useful if you
want to drive UI navigation from a gamepad or custom bindings instead.

## Tab order

Any entity with [`UiFocusableEcsComponent`](/Forge/docs/api/interfaces/UiFocusableEcsComponent)
(`focusable: true`) participates in tab order, sorted by `tabIndex`
ascending; ties are broken by entity id, which gives a stable, reproducible
order matching roughly the order widgets were created in, but isn't
something you should rely on for precise control. Widget factories default
`tabIndex` to `0`, so a screen with several buttons all left at the default
tabs through them in creation order; set explicit `tabIndex` values only
when you need an order that differs from that.

- **Tab** advances focus forward, wrapping from the last focusable element
  back to the first.
- **Shift+Tab** (Tab while `ui.shift` is held) reverses direction, also
  wrapping.
- If nothing is currently focused, the first Tab press focuses the first
  element in tab order (`currentIndex` resolves to `-1`, so the "next"
  index is `0`).

## Arrow-key spatial navigation

`ui.navigateUp/Down/Left/Right` move focus to the nearest focusable
element in that direction, measured from the centre of each element's
`resolvedRect`. Candidates behind the current element (a non-positive dot
product against the direction vector) are excluded, so pressing Right
never jumps to something on your left even if it happens to be closer
diagonally. If no candidate exists in that direction (for example, the
rightmost button in a row), navigation falls back to the next element in
tab order rather than doing nothing.

Spatial nav and tab order share the same candidate set
(`UiFocusableEcsComponent.focusable === true`), so a grid of buttons laid
out with anchors gets reasonable arrow-key behaviour with no extra
configuration, no separate "neighbour" graph to maintain by hand.

## Activation and cancellation

- **Enter or Space** (`ui.activate`) synthesizes `onPressStart` →
  `onPressEnd` → `onClick` on the currently focused element, with
  `source: 'keyboard'`, the same event sequence a pointer click produces.
  A disabled focused element, or no element focused at all, makes this a
  no-op.
- **Escape** (`ui.cancel`) clears focus entirely (`setFocus(..., null, 'keyboard')`).

Elements with a `UiInputEcsComponent` (input boxes) are skipped by both
`ui.activate` and arrow-key navigation while focused, since Enter and the
arrow keys are needed for text editing (submit/caret movement) instead;
see [Input Boxes](./input-boxes.md).

## The focus ring

[`setFocus`](/Forge/docs/api/functions/setFocus) sets
`UiFocusEcsComponent.focusRing` to `true` when the focus change came from
the keyboard, and `false` when it came from a pointer click on a focusable
element. This is the standard "don't show a focus ring after a mouse
click" convention: a widget's focused-state border or outline should
condition on `focusRing`, not just `focused`, if you want pointer clicks to
skip the ring while still updating `state.focused` for styling purposes
like the `focused` entry in [`stateStyles`](./interaction-and-events.md#per-state-style).

Rendering the ring itself is left to the element's own shader/style, the
component only tracks whether one *should* be shown.

## Gotchas

- **A focused element that becomes non-focusable loses focus on the next
  system tick**, not immediately. `setFocus` validates `focusable` when
  granting focus, but toggling `UiFocusableEcsComponent.focusable` to
  `false` on an already-focused element doesn't retroactively blur it,
  `createUiKeyboardNavEcsSystem` and `createUiStateEcsSystem` don't poll
  for this every frame on their own; the next explicit `setFocus` call (a
  Tab press, a click elsewhere) is what clears it. Call `setFocus(world,
  canvasEntity, null, 'keyboard')` yourself if you need it cleared the
  instant a widget becomes non-interactive.
- **`tabIndex` ties don't preserve visual layout order**, they preserve
  entity creation order. If you build a row of buttons in a loop and later
  reorder them visually (different `rect`s) without also setting distinct
  `tabIndex` values, tab order silently stops matching what's on screen.
- **Clicking a focusable element focuses it, but clicking a non-focusable
  interactive element does not change focus at all** (`onClick` still
  fires either way). Don't assume every clickable thing becomes focused;
  only entities with `UiFocusableEcsComponent.focusable === true` do.
- **`registerUiInputActions` actions live in the `'ui'` input group.**
  If your game also uses `inputManager`'s group switching for gameplay
  input, make sure the `'ui'` group is active (or that groups overlap as
  intended) for keyboard nav to receive events at all; an inactive group
  means `getTriggerAction`/`getHoldAction` calls inside the nav system
  simply don't fire, with no error.

## Common mistake

Forgetting `UiFocusableEcsComponent` on a custom interactive entity makes
it clickable but permanently unreachable by keyboard:

```ts
// Wrong: hit-testable and clickable, but Tab/arrow nav never reaches it.
world.addComponent(entity, uiInteractableId, { enabled: true, blocksPointer: true });
world.addComponent(entity, uiStateId, createUiState());

// Right: also opt into the tab order.
world.addComponent(entity, uiFocusableId, { tabIndex: 0, focusable: true });
```

`createUiButton`, `createUiCheckbox`, and the other built-in widgets
already do this; it only matters when assembling a fully custom
interactive entity from raw components.

See [Interaction and Events](./interaction-and-events.md) for how
`onFocus`/`onBlur` fit into the broader event model, and
[Defocus and Blur Behaviour](./defocus-and-blur.md) for what clears focus
when the browser context changes rather than user input.
