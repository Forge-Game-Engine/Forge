---
sidebar_position: 8
---

# Defocus and Blur Behaviour

Pointer hover/press state and keyboard focus need to be cleared in response
to events that happen outside the normal hit-test/state pipeline: the
player alt-tabs away, the game container loses browser focus, or the
canvas resizes out from under a hovered element. Without explicit handling
for these, an element can stay "stuck" hovered or pressed because no
pointer-up or mouseout ever reaches the engine while the tab was hidden.
[`createUiBlurObserver`](/Forge/docs/api/functions/createUiBlurObserver) is
the single sanctioned place this DOM integration happens; widgets
themselves never add their own blur/visibility listeners.

```ts
import { createUiBlurObserver } from '@forge-game-engine/forge/ui';

const blurObserver = createUiBlurObserver(world, canvasEntity, container, {
  onResize: resizeObserver.onResize,
});

// Tear down alongside the world/scene:
blurObserver.stop();
```

## What each event clears

[`UiBlurPolicy`](/Forge/docs/api/interfaces/UiBlurPolicy) controls hover,
press, and focus independently per event source, with these defaults
([`defaultUiBlurPolicy`](/Forge/docs/api/variables/defaultUiBlurPolicy)):

| Event | hover | press | focus |
|---|---|---|---|
| Element/container blur (`blur`/`focusout` on the container) | cleared | cleared | kept |
| Browser tab/window blur (`window` `blur`, or `visibilitychange` to hidden) | cleared | cleared | kept |
| Pointer leaves the container (`mouseleave`) | cleared | cleared | not touched |
| Canvas resize | cleared | cleared | not touched |

Keyboard **focus is preserved by default** across container blur and tab
blur, the rationale being that switching tabs and coming back, or briefly
clicking outside the game container, shouldn't make the player re-tab
through a form to get back to where they were. Hover and press, by
contrast, are always cleared on these events, since whatever was hovered
or pressed before the blur is almost certainly stale by the time input
resumes (the pointer has likely moved, or the press was never properly
released because the button-up event never reached the page).

### Element/container blur

Fires from `blur` and `focusout` listeners attached to `container` (with
`capture: true`, so it catches blur events bubbling from descendants too).
This is the browser-focus equivalent of clicking away from the game's DOM
element, for example, into a different `<input>` on the page hosting the
canvas.

### Browser-tab blur

Two separate DOM signals both feed the same policy fields
(`clearHoverOnTabBlur` / `clearPressOnTabBlur` / `clearFocusOnTabBlur`):
`window`'s `blur` event, and `document`'s `visibilitychange` event when
`document.visibilityState` becomes `'hidden'`. Either one triggers
identical clearing behaviour, covering both "switched to another window"
and "switched to another tab" cases.

### Pointer leaving the container

`mouseleave` on `container` clears hover and press (`clearFocus` is hardcoded
to `false` here, not policy-configurable) since the pointer is no longer
over the canvas at all and any in-progress press can't be meaningfully
completed. Focus is never touched by mouse-leave, moving the mouse off the
canvas while a text input is focused (to read something else on the page,
for instance) doesn't blur the input.

### Canvas resize

When an `onResize` event (from [`createUiResizeObserver`](/Forge/docs/api/functions/createUiResizeObserver))
is passed in, a resize clears hover and press (again, never focus). The
element that was hovered before a resize is very likely at a different
screen position afterward, so clearing it avoids a frame where the wrong
element appears hovered until the pointer actually moves again.

## How clearing actually happens

`createUiBlurObserver` doesn't reach into entities directly, it calls the
same mechanisms the hit-test/state systems use: clearing `hovered` raises
`onHoverExit` on the previously-hovered entity exactly as if the pointer
had moved away normally, clearing `pressed` raises `onPressEnd` (with no
`onClick`, since the pointer didn't actually release over the element),
and clearing focus calls [`setFocus`](./focus-and-keyboard-navigation.md)
with `null`, which raises `onBlur` on the previously-focused entity. Any
listener you've attached to these events (including the per-state styling
every widget factory wires up) reacts the same way it would to a "normal"
loss of hover/press/focus; there's no separate blur-specific event type to
handle.

## Gotchas

- **Only one blur observer should exist per canvas.** Multiple observers
  on the same canvas/container both react to the same DOM events and both
  call `clearInteractionState`, which is harmless (clearing an already-null
  `hovered`/`pressed` is a no-op) but wasteful. Create one per canvas
  during scene setup, store the handle, and call `stop()` on teardown.
- **`stop()` must be called on scene/world teardown, or the DOM listeners
  leak.** `createUiBlurObserver` attaches listeners directly to `container`,
  `window`, and `document`, none of which are cleaned up by destroying the
  ECS world; only `stop()` removes them.
- **The resize-driven clearing only happens if you pass `onResize`.**
  Without it, `createUiBlurObserver` still handles container/tab/mouseleave
  blur, but a resize won't clear stale hover state, you'd see a frame or
  two of an incorrectly-hovered element until the pointer moves. Wire
  `resizeObserver.onResize` through if you're also using
  [`createUiResizeObserver`](./layout-and-anchors.md#resize-handling).
- **Policy overrides are partial and merged with defaults**, you only need
  to specify the fields you want to change:

  ```ts
  createUiBlurObserver(world, canvasEntity, container, {
    policy: { clearFocusOnTabBlur: true }, // also drop focus on tab-away
  });
  ```

## Common mistake

Relying on the browser's native `blur`/`mouseleave` events directly on
individual widgets, instead of the shared observer, duplicates state
clearing and can race with the canonical hit-test/state systems:

```ts
// Wrong: a widget adding its own DOM listener, bypassing the policy and
// risking a double-clear or an out-of-order event relative to the
// hit-test system's own frame-by-frame updates.
button.element?.addEventListener('mouseleave', () => {
  button.state.hovered = false;
});

// Right: rely on the single shared blur observer for the whole canvas.
createUiBlurObserver(world, canvasEntity, container);
```

UI entities don't generally have their own DOM elements at all (they're
ECS entities rendered into one shared canvas), so this mistake usually
shows up as someone reaching for `container` or `renderContext.canvas`
directly inside widget code instead of going through the observer.

See [Interaction and Events](./interaction-and-events.md) for the
hover/press/click event lifecycle this guide builds on, and
[Focus and Keyboard Navigation](./focus-and-keyboard-navigation.md) for how
`setFocus` and the focus ring work under normal (non-blur) focus changes.
