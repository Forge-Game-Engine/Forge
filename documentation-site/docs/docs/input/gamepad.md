---
sidebar_position: 4
---

# Gamepad Input

[`GamepadInputSource`](/Forge/docs/api/classes/GamepadInputSource) reads
from `navigator.getGamepads()` and dispatches to whichever bindings match.
Unlike `KeyboardInputSource` and `MouseInputSource`, the Gamepad API has no
change events, so this source polls the gamepad's state every frame instead
of listening for browser events. Create one per `InputManager`:

```ts
import { GamepadInputSource } from '@forge-game-engine/forge/input';

const gamepad = new GamepadInputSource(inputManager);
```

Then add bindings to the matching set on the source:

| Binding                                                                | Set              | Action         |
| ---------------------------------------------------------------------- | ---------------- | -------------- |
| [`GamepadAxis1dBinding`](/Forge/docs/api/classes/GamepadAxis1dBinding) | `axis1dBindings` | `Axis1dAction` |

[`GamepadAxis1dBinding`](/Forge/docs/api/classes/GamepadAxis1dBinding) reads
from either a single analog stick axis, or a pair of digital buttons like a
D-pad, so the same logical action can be driven by both at once.

Axis and button indices use
[`GamepadAxisIndex`](/Forge/docs/api/type-aliases/GamepadAxisIndex) values
from [`gamepadAxes`](/Forge/docs/api/variables/gamepadAxes), and
[`GamepadButtonIndex`](/Forge/docs/api/type-aliases/GamepadButtonIndex)
values from [`gamepadButtons`](/Forge/docs/api/variables/gamepadButtons),
matching the
[W3C Standard Gamepad](https://www.w3.org/TR/gamepad/#remapping) layout.

## Worked example: move from a stick or a D-pad

```ts
import {
  Axis1dAction,
  actionResetTypes,
  gamepadAxes,
  gamepadButtons,
  GamepadAxis1dBinding,
  GamepadInputSource,
  registerInputs,
} from '@forge-game-engine/forge/input';

const move = new Axis1dAction('move', 'game', actionResetTypes.noReset);

const inputManager = registerInputs(world, time, {
  axis1dActions: [move],
});

const gamepad = new GamepadInputSource(inputManager);

gamepad.axis1dBindings.add(
  new GamepadAxis1dBinding(move, { axisIndex: gamepadAxes.leftStickX }),
);

gamepad.axis1dBindings.add(
  new GamepadAxis1dBinding(move, {
    positiveButtonIndex: gamepadButtons.dpadRight,
    negativeButtonIndex: gamepadButtons.dpadLeft,
  }),
);
```

Binding both the stick and the D-pad to the same action, the same way the
[keyboard guide](./keyboard.md) binds both WASD and arrow keys, lets players
use whichever control their gamepad supports without any extra branching in
game code.

## Gotchas

`GamepadInputSource.update()` polls the gamepad every frame, but only calls
`set()` on a binding's action when _this source's own_ combined value
actually changes from the previous frame, the same as `KeyboardAxis1dBinding`
and `MouseAxis2dBinding` only calling `set()` on a browser event. This
matters when an action is shared with an event-driven source: if the
gamepad re-dispatched its idle value every single frame regardless of
change, an idle controller would snap a keyboard-driven action back to `0`
on the very next frame after every key press. Like the other axis bindings,
`GamepadAxis1dBinding` needs `actionResetTypes.noReset` on its action, see
[Actions and Input Groups](./actions.md#reset-behavior-zero-vs-noreset).

Multiple `GamepadAxis1dBinding`s on the same `GamepadInputSource` can target
the same action, like the stick and D-pad bindings in the worked example
above. Their values are summed and clamped to `[-1, 1]` before dispatching,
the same "opposite inputs cancel out" behavior documented for
[keyboard axis bindings](./keyboard.md#gotchas). Bindings on _different_
`GamepadInputSource` or `KeyboardInputSource` instances don't combine this
way: whichever source dispatches most recently simply overwrites the
action's value, so switching between a controller and the keyboard mid-game
works, but holding both at once just means the last one touched wins.

Stick axis values within `±0.15` of `0` are treated as `0`, to absorb
resting drift on analog sticks. This deadzone isn't configurable per
binding; if a game needs a different threshold, read
`navigator.getGamepads()` directly instead of going through
`GamepadAxis1dBinding`.

`GamepadInputSource` reads a single gamepad, selected by index (`0`, the
first connected gamepad, by default) at construction. For local
multiplayer, construct one `GamepadInputSource` per player with a
different `gamepadIndex`, each driving its own `InputManager` and input
group.

Browsers only populate `navigator.getGamepads()` for a controller after the
page has seen some input from it, typically a button press, not just
moving a stick. Until then, `GamepadInputSource.update()` finds no gamepad
at its index and skips the frame entirely, so bound actions simply keep
whatever value they last had. No special handling is needed in game code,
but don't be surprised if a freshly connected controller stays silent until
the player presses a button on it once.

[`GamepadInputSource.stop()`](/Forge/docs/api/classes/GamepadInputSource#stop)
unregisters it from the `InputManager`. Unlike `KeyboardInputSource` and
`MouseInputSource`, there are no event listeners to remove (the source
polls rather than listens), but it still needs to be unregistered so the
`InputManager` stops calling `update()` on it.
