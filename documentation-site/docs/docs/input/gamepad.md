---
sidebar_position: 4
---

# Gamepad Input

[`GamepadInputSource`](/Forge/docs/api/classes/GamepadInputSource) reads
one gamepad from `navigator.getGamepads()` and reports the state of every
binding to its `InputManager`. The Gamepad API has no change events, so the
source polls the gamepad every frame, when the `InputManager` updates.

## Creating a gamepad source

```ts
import { GamepadInputSource } from '@forge-game-engine/forge/input';

const gamepad = new GamepadInputSource(inputManager);
```

The source reads the gamepad at index `0` in `navigator.getGamepads()`
unless constructed with another `gamepadIndex`. For local multiplayer,
create one source per player with a different `gamepadIndex`, each with
its own `InputManager`.

:::note
A browser lists a gamepad in `navigator.getGamepads()` only after the page
has received input from it, such as a button press. Until then the source
finds no gamepad and reports nothing.
:::

## Binding buttons and sticks to actions

Add a binding to the source's set for the action's type:

| Binding                                                                  | Set               | Action          |
| ------------------------------------------------------------------------ | ----------------- | --------------- |
| [`GamepadTriggerBinding`](/Forge/docs/api/classes/GamepadTriggerBinding) | `triggerBindings` | `TriggerAction` |
| [`GamepadHoldBinding`](/Forge/docs/api/classes/GamepadHoldBinding)       | `holdBindings`    | `HoldAction`    |
| [`GamepadAxis1dBinding`](/Forge/docs/api/classes/GamepadAxis1dBinding)   | `axis1dBindings`  | `Axis1dAction`  |
| [`GamepadAxis2dBinding`](/Forge/docs/api/classes/GamepadAxis2dBinding)   | `axis2dBindings`  | `Axis2dAction`  |

Buttons are [`GamepadButtonIndex`](/Forge/docs/api/type-aliases/GamepadButtonIndex)
values from [`gamepadButtons`](/Forge/docs/api/variables/gamepadButtons),
and stick axes are
[`GamepadAxisIndex`](/Forge/docs/api/type-aliases/GamepadAxisIndex) values
from [`gamepadAxes`](/Forge/docs/api/variables/gamepadAxes). Both follow the
[W3C Standard Gamepad](https://www.w3.org/TR/gamepad/#remapping) layout.

A trigger binding fires its action when its button goes down
(`buttonMoments.down`) or comes up (`buttonMoments.up`), and a hold binding
holds its action while its button is pressed. An axis binding reads either
a stick or buttons: a `GamepadAxis1dBinding` takes one stick axis or a
positive and a negative button, and a `GamepadAxis2dBinding` takes a
stick's X and Y axes or four buttons (north, south, east and west).

```ts
import {
  GamepadAxis2dBinding,
  GamepadHoldBinding,
  GamepadTriggerBinding,
  buttonMoments,
  gamepadAxes,
  gamepadButtons,
} from '@forge-game-engine/forge/input';

gamepad.axis2dBindings.add(
  new GamepadAxis2dBinding(move, {
    xAxisIndex: gamepadAxes.leftStickX,
    yAxisIndex: gamepadAxes.leftStickY,
  }),
);

gamepad.axis2dBindings.add(
  new GamepadAxis2dBinding(move, {
    northButtonIndex: gamepadButtons.dpadUp,
    southButtonIndex: gamepadButtons.dpadDown,
    eastButtonIndex: gamepadButtons.dpadRight,
    westButtonIndex: gamepadButtons.dpadLeft,
  }),
);

gamepad.holdBindings.add(
  new GamepadHoldBinding(sprint, gamepadButtons.rightTrigger),
);

gamepad.triggerBindings.add(
  new GamepadTriggerBinding(
    jump,
    gamepadButtons.faceButtonBottom,
    buttonMoments.down,
  ),
);
```

Several bindings on one source can target the same action, like the stick
and D-pad above. The source sums every axis binding for the action and
clamps the result to `-1` to `1` (per component for an `Axis2dAction`). A
hold is held while any of its buttons is pressed. Bindings on other sources
for the same action are combined by the `InputManager` (see
[Combining input from several sources](./actions.md#combining-input-from-several-sources)).

:::note
The source compares each button's state from one frame to the next, so a
press and release that both happen between two frames isn't reported, and
a button that's down when the gamepad is first read fires its down-moment
trigger. Hold and trigger bindings read a button's `pressed` flag. Axis
bindings built from buttons read the button's analog `value`, from `0` to
`1`.
:::

## Reading sticks

A stick pushed up reads `+1` and pushed down reads `-1`, matching the
engine's Y-up world and the D-pad's north button. The W3C Standard Gamepad
reports the opposite, so the source negates `gamepadAxes.leftStickY` and
`gamepadAxes.rightStickY` as it reads them. Values read directly from
`navigator.getGamepads()` keep the W3C sign.

Stick values within `0.15` of `0` read `0`. A `GamepadAxis2dBinding`
applies this to the stick's deflection (the length of its `(x, y)` vector),
so a small diagonal push isn't snapped onto one axis.

## Disconnecting a gamepad

When the gamepad is disconnected, the source releases everything it was
holding, so its axes read `0` and its holds end. Trigger bindings don't
fire. This happens on the `gamepaddisconnected` event, or on the next poll
that doesn't find the gamepad in `navigator.getGamepads()`, whichever comes
first.

The source reads a gamepad again when one connects at its index. A source
constructed with `gamepadIndex` `-1` reads the last connected gamepad, and
when that gamepad disconnects it reads another connected gamepad, if there
is one.

## Stopping the source

[`stop()`](/Forge/docs/api/classes/GamepadInputSource#stop) removes the
source from the `InputManager`'s updates, releases everything it was
holding, and removes its `gamepadconnected` and `gamepaddisconnected`
listeners.

```ts
gamepad.stop();
```
