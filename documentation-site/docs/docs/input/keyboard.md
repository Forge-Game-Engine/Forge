---
sidebar_position: 2
---

# Keyboard Input

[`KeyboardInputSource`](/Forge/docs/api/classes/KeyboardInputSource) listens
for `keydown`/`keyup` events on `globalThis` (the whole page, not a specific
element) and dispatches to whichever bindings match the key that changed.
Create one per `InputManager`:

```ts
import { KeyboardInputSource } from '@forge-game-engine/forge/input';

const keyboard = new KeyboardInputSource(inputManager);
```

Then add bindings to the matching set on the source. There is one binding
type per action type:

| Binding | Set | Action |
| --- | --- | --- |
| [`KeyboardTriggerBinding`](/Forge/docs/api/classes/KeyboardTriggerBinding) | `triggerBindings` | `TriggerAction` |
| [`KeyboardHoldBinding`](/Forge/docs/api/classes/KeyboardHoldBinding) | `holdBindings` | `HoldAction` |
| [`KeyboardAxis1dBinding`](/Forge/docs/api/classes/KeyboardAxis1dBinding) | `axis1dBindings` | `Axis1dAction` |
| [`KeyboardAxis2dBinding`](/Forge/docs/api/classes/KeyboardAxis2dBinding) | `axis2dBindings` | `Axis2dAction` |

Key codes use [`KeyCode`](/Forge/docs/api/type-aliases/KeyCode) values from
[`keyCodes`](/Forge/docs/api/variables/keyCodes), which map readable names
(`keyCodes.w`, `keyCodes.space`, `keyCodes.arrowUp`, ...) to the
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
values they correspond to.

## Worked example

```ts
import {
  Axis2dAction,
  HoldAction,
  TriggerAction,
  actionResetTypes,
  buttonMoments,
  keyCodes,
  KeyboardAxis2dBinding,
  KeyboardHoldBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
} from '@forge-game-engine/forge/input';

const move = new Axis2dAction('move', 'game', actionResetTypes.noReset);
const jump = new TriggerAction('jump');
const sprint = new HoldAction('sprint');

const inputManager = registerInputs(world, time, {
  axis2dActions: [move],
  triggerActions: [jump],
  holdActions: [sprint],
});

const keyboard = new KeyboardInputSource(inputManager);

keyboard.axis2dBindings.add(
  new KeyboardAxis2dBinding(
    move,
    keyCodes.w, // north
    keyCodes.s, // south
    keyCodes.d, // east
    keyCodes.a, // west
  ),
);

keyboard.triggerBindings.add(
  new KeyboardTriggerBinding(jump, keyCodes.space, buttonMoments.down),
);

keyboard.holdBindings.add(
  new KeyboardHoldBinding(sprint, keyCodes.shiftLeft),
);
```

## Gotchas

:::caution
Axis bindings need `actionResetTypes.noReset` on their action, see
[Actions and Input Groups](./actions.md#reset-behavior-zero-vs-noreset).
`KeyboardAxis1dBinding` and `KeyboardAxis2dBinding` only call `set()` on
`keydown`/`keyup`, not every frame, so an axis using the default
`actionResetTypes.zero` snaps back to `0` on the frame after a key is
pressed even though the key is still held.
:::

`KeyboardAxis1dBinding` and `KeyboardAxis2dBinding` work additively:
pressing `positiveKeyCode` adds `1` to the current value, pressing
`negativeKeyCode` subtracts `1`, and releasing a key undoes the same amount.
This means opposite keys held at the same time cancel out to `0`, rather than the more recently pressed
key "winning".

Key repeat events are ignored (the browser's
[`KeyboardEvent.repeat`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat)
flag), so holding a key down dispatches bindings exactly once on press and
once on release, not on every repeated `keydown`.

[`KeyboardInputSource.stop()`](/Forge/docs/api/classes/KeyboardInputSource#stop)
removes its `keydown`/`keyup` listeners and unregisters it from the
`InputManager`. Call it when the source is no longer needed, for example
when tearing down a game instance in tests, since the listeners are attached
to `globalThis` and otherwise outlive the source.
