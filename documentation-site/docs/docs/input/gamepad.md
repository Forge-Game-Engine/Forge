---
sidebar_position: 4
---

# Gamepad Input

[`GamepadInputSource`](/Forge/docs/api/classes/GamepadInputSource) reads
from `navigator.getGamepads()` and reports the state of every binding to its
`InputManager`.
Unlike `KeyboardInputSource` and `MouseInputSource`, the Gamepad API has no
change events, so this source polls the gamepad's state every frame instead
of listening for browser events. Create one per `InputManager`:

```ts
import { GamepadInputSource } from '@forge-game-engine/forge/input';

const gamepad = new GamepadInputSource(inputManager);
```

Then add bindings to the matching set on the source:

| Binding                                                                  | Set               | Action          |
| ------------------------------------------------------------------------ | ----------------- | --------------- |
| [`GamepadTriggerBinding`](/Forge/docs/api/classes/GamepadTriggerBinding) | `triggerBindings` | `TriggerAction` |
| [`GamepadHoldBinding`](/Forge/docs/api/classes/GamepadHoldBinding)       | `holdBindings`    | `HoldAction`    |
| [`GamepadAxis1dBinding`](/Forge/docs/api/classes/GamepadAxis1dBinding)   | `axis1dBindings`  | `Axis1dAction`  |
| [`GamepadAxis2dBinding`](/Forge/docs/api/classes/GamepadAxis2dBinding)   | `axis2dBindings`  | `Axis2dAction`  |

[`GamepadTriggerBinding`](/Forge/docs/api/classes/GamepadTriggerBinding)
fires its action once when a button is pressed or released (picked with
`buttonMoments.down` or `buttonMoments.up`, the same as
`KeyboardTriggerBinding`), and
[`GamepadHoldBinding`](/Forge/docs/api/classes/GamepadHoldBinding) holds its
action for as long as a button is pressed.

[`GamepadAxis1dBinding`](/Forge/docs/api/classes/GamepadAxis1dBinding) reads
from either a single analog stick axis, or a pair of digital buttons like a
D-pad, so the same logical action can be driven by both at once.
[`GamepadAxis2dBinding`](/Forge/docs/api/classes/GamepadAxis2dBinding) does
the same in two dimensions, from either a stick's X and Y axes or four
buttons (north, south, east and west).

Axis and button indices use
[`GamepadAxisIndex`](/Forge/docs/api/type-aliases/GamepadAxisIndex) values
from [`gamepadAxes`](/Forge/docs/api/variables/gamepadAxes), and
[`GamepadButtonIndex`](/Forge/docs/api/type-aliases/GamepadButtonIndex)
values from [`gamepadButtons`](/Forge/docs/api/variables/gamepadButtons),
matching the
[W3C Standard Gamepad](https://www.w3.org/TR/gamepad/#remapping) layout.

## Worked example: move, shoot and restart

```ts
import {
  Axis1dAction,
  HoldAction,
  TriggerAction,
  buttonMoments,
  gamepadAxes,
  gamepadButtons,
  GamepadAxis1dBinding,
  GamepadHoldBinding,
  GamepadInputSource,
  GamepadTriggerBinding,
  registerInputs,
} from '@forge-game-engine/forge/input';

const moveVertical = new Axis1dAction('moveVertical');
const shoot = new HoldAction('shoot');
const restart = new TriggerAction('restart');

const inputManager = registerInputs(world, time, {
  axis1dActions: [moveVertical],
  holdActions: [shoot],
  triggerActions: [restart],
});

const gamepad = new GamepadInputSource(inputManager);

// Pushing the stick up reads as positive, matching the D-pad binding below.
gamepad.axis1dBindings.add(
  new GamepadAxis1dBinding(moveVertical, {
    axisIndex: gamepadAxes.leftStickY,
  }),
);

gamepad.axis1dBindings.add(
  new GamepadAxis1dBinding(moveVertical, {
    positiveButtonIndex: gamepadButtons.dpadUp,
    negativeButtonIndex: gamepadButtons.dpadDown,
  }),
);

gamepad.holdBindings.add(
  new GamepadHoldBinding(shoot, gamepadButtons.faceButtonBottom),
);
gamepad.holdBindings.add(
  new GamepadHoldBinding(shoot, gamepadButtons.rightTrigger),
);

gamepad.triggerBindings.add(
  new GamepadTriggerBinding(restart, gamepadButtons.start, buttonMoments.down),
);
```

Binding both the stick and the D-pad to the same action, the same way the
[keyboard guide](./keyboard.md) binds both WASD and arrow keys, lets players
use whichever control their gamepad supports without any extra branching in
game code. The same goes for binding two buttons to `shoot`.

These actions can also be bound on a `KeyboardInputSource` (for example
`KeyboardAxis1dBinding(moveVertical, keyCodes.w, keyCodes.s)`), so the game
reads the same `moveVertical`, `shoot` and `restart` whichever device the
player uses.

## Up is positive on a stick

A stick pushed up reads as `+1` and pushed down as `-1`, the same
up-is-positive convention `KeyboardAxis1dBinding(action, keyCodes.w, keyCodes.s)`,
`KeyboardAxis2dBinding`'s north key and world space follow. So a stick and a
D-pad bound to the same action agree without any extra configuration. The
[W3C Standard Gamepad](https://www.w3.org/TR/gamepad/#remapping) reports
the opposite, so `GamepadInputSource` flips `gamepadAxes.leftStickY` and
`gamepadAxes.rightStickY` as it reads them. Raw values from
`navigator.getGamepads()` still use the W3C sign.

To offer players inverted look controls, negate the action's value in game
code when the setting is on.

## Gotchas

`GamepadInputSource.update()` polls the gamepad every frame and reports
every binding's current state. The `InputManager` combines the gamepad's
reports with other sources', so an idle controller reporting `0` doesn't
override a held key, see
[Combining input from several sources](./actions.md#combining-input-from-several-sources).

Multiple axis bindings on the same `GamepadInputSource` can target the same
action, like the stick and D-pad bindings in the worked example above.
Their values are summed and clamped to `[-1, 1]` (per component, for a 2D
axis) before reporting, the same "opposite inputs cancel out" behavior
documented for [keyboard axis bindings](./keyboard.md#gotchas). Multiple
hold bindings on the same action hold it while _any_ of their buttons is
pressed, so letting go of one of two pressed buttons doesn't end the hold.

Because the source polls, a trigger binding sees a button change between
one frame and the next, not each browser-level press. A press and release
that both happen between two frames is missed entirely, and a button
pressed down when the gamepad is first read counts as a fresh press. Hold
and trigger bindings use the button's `pressed` flag, so an analog trigger
counts as pressed once it passes the browser's own threshold, while an
axis binding built from buttons reads their analog `value` instead.

Stick axis values within `±0.15` of `0` are treated as `0`, to absorb
resting drift on analog sticks. `GamepadAxis2dBinding` applies this to the
stick's overall deflection (the length of its `(x, y)` vector) rather
than to each axis on its own, so a slight diagonal push isn't snapped onto
one axis. This deadzone
isn't configurable per binding; if a game needs a different threshold,
read `navigator.getGamepads()` directly instead of going through the
gamepad bindings.

`GamepadInputSource` reads a single gamepad, selected by index (`0`, the
first connected gamepad, by default) at construction. For local
multiplayer, construct one `GamepadInputSource` per player with a
different `gamepadIndex`, each driving its own `InputManager` and input
group.

Browsers only populate `navigator.getGamepads()` for a controller after the
page has seen some input from it, typically a button press, not just
moving a stick. Until then, `GamepadInputSource.update()` finds no gamepad
at its index and reports nothing.

When the gamepad is unplugged, the source releases everything it was
holding: its axes and holds no longer read the gamepad. This happens on
the browser's `gamepaddisconnected` event, or on the next poll that finds
the gamepad missing from `navigator.getGamepads()`, whichever comes first.
Trigger bindings don't fire on a disconnect. A source constructed with `gamepadIndex` `-1`
then falls back to another connected gamepad, if there is one; otherwise
the source picks the gamepad back up when one connects at its index.

[`GamepadInputSource.stop()`](/Forge/docs/api/classes/GamepadInputSource#stop)
unregisters it from the `InputManager` (so it stops calling `update()` on
it), releases everything it was holding, and removes its
`gamepadconnected` and `gamepaddisconnected` listeners.
