---
sidebar_position: 1
---

# Actions and Input Groups

Forge separates "what the player did" (an `InputAction`) from "how they did
it" (an [`InputBinding`](/Forge/docs/api/interfaces/InputBinding) on a
[`KeyboardInputSource`](/Forge/docs/api/classes/KeyboardInputSource) or
[`MouseInputSource`](/Forge/docs/api/classes/MouseInputSource)). Gameplay
code only ever reads the action, so the same "jump" or "move" action can be
driven by multiple bindings, on multiple sources, without the rest of the
game knowing which key or button was used.

## Choosing an action type

- [`TriggerAction`](/Forge/docs/api/classes/TriggerAction): a one-shot event
  via `isTriggered` and `triggerEvent`, true for exactly one frame. Use it
  for things that happen once per press: jump, fire, pause, confirm.
- [`HoldAction`](/Forge/docs/api/classes/HoldAction): tracks whether a button
  is currently held via `isHeld`, `holdStartEvent`, and `holdEndEvent`. Use
  it for sprint, charging an attack, or aiming down sights.
- [`Axis1dAction`](/Forge/docs/api/classes/Axis1dAction): a single `value`
  from -1 to 1. Use it for a throttle, zoom level, or mouse wheel scroll.
- [`Axis2dAction`](/Forge/docs/api/classes/Axis2dAction): a `Vector2`
  `value` with x and y each from -1 to 1. Use it for movement, look
  direction, or cursor position.

Create actions up front and pass them to
[`registerInputs`](/Forge/docs/api/functions/registerInputs), then bind them
to one or more input sources, see [Keyboard Input](./keyboard.md) and
[Mouse Input](./mouse.md). The same action can be bound on multiple sources
at once, for example a "jump" `TriggerAction` bound to both the Space key and
a mouse button.

## Reading action state

Poll the current value each frame:

```ts
if (jump.isTriggered) {
  /* ... */
}

if (sprint.isHeld) {
  /* ... */
}

const scrollDelta = zoom.value; // Axis1dAction: number, -1..1
const direction = move.value; // Axis2dAction: Vector2, x/y each -1..1
```

Or subscribe to changes instead of polling:

```ts
move.valueChangeEvent.registerListener((value) => {
  console.log('move changed to', value.x, value.y);
});

jump.triggerEvent.registerListener(() => {
  console.log('jump triggered');
});
```

## Reset behavior: `zero` vs `noReset`

Every frame, [`registerInputs`](/Forge/docs/api/functions/registerInputs)
adds a system that calls
[`inputManager.reset()`](/Forge/docs/api/classes/InputManager#reset) after
your game systems run. What that does depends on the action type:

- `TriggerAction` is always cleared, so `isTriggered` is `true` for exactly
  the one frame after the trigger fires.
- `HoldAction` is never reset by this system, `isHeld` only changes in
  response to `startHold`/`endHold`.
- `Axis1dAction` and `Axis2dAction` reset according to their
  [`ActionResetType`](/Forge/docs/api/type-aliases/ActionResetType), set as
  the last constructor argument (default
  [`actionResetTypes.zero`](/Forge/docs/api/variables/actionResetTypes)):
  - `zero`: the value is set back to `0` (or `Vector2.zero`) every frame.
    Correct for "delta this frame" inputs, such as mouse wheel scroll, where
    the binding only calls `set()` while the input is actively changing.
  - `noReset`: the value is left untouched. Required for any axis whose
    binding only calls `set()` on a state *change*, such as a direction key
    being pressed or released, or a cursor position that should persist
    between `mousemove` events.

:::caution
The default is `zero`. A keyboard-bound movement `Axis2dAction` created with
the default will appear to twitch: it jumps to ±1 for the one frame a key is
pressed, then snaps back to `0` on the next frame's reset, even while the key
is still held down. Pass `actionResetTypes.noReset` for any axis driven by
held keys or by cursor position:

```ts
const move = new Axis2dAction('move', 'game', actionResetTypes.noReset);
```
:::

## Input groups

Every action has an `inputGroup`, defaulting to `'game'`, set as the second
constructor argument.
[`InputManager.setActiveGroup`](/Forge/docs/api/classes/InputManager#setactivegroup)
controls which group's actions actually respond to input:
`dispatchTriggerAction`, `dispatchAxis1dAction`, and friends all check
`binding.action.inputGroup === activeGroup` before applying the input, and
silently do nothing otherwise.

This is the mechanism for input contexts, such as switching from gameplay to
a pause menu:

```ts
const pause = new TriggerAction('pause', 'game');
const resume = new TriggerAction('resume', 'menu');

pause.triggerEvent.registerListener(() => {
  inputManager.setActiveGroup('menu');
});

resume.triggerEvent.registerListener(() => {
  inputManager.setActiveGroup('game');
});
```

While `activeGroup` is `'menu'`, bindings for actions with
`inputGroup: 'game'` (movement, jump, etc.) are still dispatched but
discarded, so the player can't move while the pause menu is open, without
removing or re-creating any bindings.

:::caution
[`dispatchHoldEndAction`](/Forge/docs/api/classes/InputManager#dispatchholdendaction)
runs regardless of the active group. If a `HoldAction` started while its
group was active and the group changes before the key or button is
released, the hold still ends correctly instead of getting stuck with
`isHeld: true`.
:::
