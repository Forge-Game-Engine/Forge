---
sidebar_position: 2
---

# Keyboard Input

[`KeyboardInputSource`](/Forge/docs/api/classes/KeyboardInputSource) listens
for `keydown`/`keyup` events on `globalThis` (the whole page, not a specific
element) and, when a key goes down or comes up, reports the state of every
binding on that key to its `InputManager`.
Create one per `InputManager`:

```ts
import { KeyboardInputSource } from '@forge-game-engine/forge/input';

const keyboard = new KeyboardInputSource(inputManager);
```

Then add bindings to the matching set on the source. There is one binding
type per action type:

| Binding                                                                    | Set               | Action          |
| -------------------------------------------------------------------------- | ----------------- | --------------- |
| [`KeyboardTriggerBinding`](/Forge/docs/api/classes/KeyboardTriggerBinding) | `triggerBindings` | `TriggerAction` |
| [`KeyboardHoldBinding`](/Forge/docs/api/classes/KeyboardHoldBinding)       | `holdBindings`    | `HoldAction`    |
| [`KeyboardAxis1dBinding`](/Forge/docs/api/classes/KeyboardAxis1dBinding)   | `axis1dBindings`  | `Axis1dAction`  |
| [`KeyboardAxis2dBinding`](/Forge/docs/api/classes/KeyboardAxis2dBinding)   | `axis2dBindings`  | `Axis2dAction`  |

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
  buttonMoments,
  keyCodes,
  KeyboardAxis2dBinding,
  KeyboardHoldBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
} from '@forge-game-engine/forge/input';

const move = new Axis2dAction('move');
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

keyboard.holdBindings.add(new KeyboardHoldBinding(sprint, keyCodes.shiftLeft));
```

## Gotchas

`KeyboardAxis1dBinding` and `KeyboardAxis2dBinding` report the axis from the
keys that are held right now: each held `positiveKeyCode` counts `+1` and
each held `negativeKeyCode` counts `-1`, summed across every binding on the
same `KeyboardInputSource` that targets the action and clamped to `[-1, 1]`.
This means opposite keys held at the same time cancel out to `0`, the same
behavior as Unity's `Input.GetAxis`, rather than the more recently pressed
key "winning", and binding both WASD and the arrow keys to one action never
pushes it past `1` when both are held. The axis keeps the reported value
until a bound key goes down or comes up. Several `KeyboardHoldBinding`s on
one action hold it while any of their keys is held.

Bindings on a _different_ source (a gamepad, say) that target the same
action are combined by the `InputManager`, see
[Combining input from several sources](./actions.md#combining-input-from-several-sources).

Keys typed into an editable element (an `<input>`, `<textarea>`, `<select>`
or `contentEditable` element, including one inside a shadow root) aren't
game input: such a key isn't held, isn't reported for any binding, and its release
is ignored too. A key that went down outside the element is still released
when its `keyup` arrives in the element. This covers HTML forms next to the
game and Forge's own [text fields](../ui/text-input.md).

Key repeat events are ignored (the browser's
[`KeyboardEvent.repeat`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat)
flag), so holding a key down reports its bindings once on press and once on
release, not on every repeated `keydown`.

[`KeyboardInputSource.stop()`](/Forge/docs/api/classes/KeyboardInputSource#stop)
removes its `keydown`/`keyup` listeners and releases every key it was
holding, so its axes and holds no longer read those keys. Call it when the source is no longer needed, for example
when tearing down a game instance in tests, since the listeners are attached
to `globalThis` and otherwise outlive the source.
