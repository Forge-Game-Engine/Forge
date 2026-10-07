---
sidebar_position: 2
---

# Keyboard Input

[`KeyboardInputSource`](/Forge/docs/api/classes/KeyboardInputSource) listens
for `keydown` and `keyup` events on `globalThis` (the whole page, not one
element). When a key goes down or comes up, it reports the state of every
binding on that key to its `InputManager`.

## Creating a keyboard source

Create one source per `InputManager`:

```ts
import { KeyboardInputSource } from '@forge-game-engine/forge/input';

const keyboard = new KeyboardInputSource(inputManager);
```

## Binding keys to actions

Add a binding to the source's set for the action's type:

| Binding                                                                    | Set               | Action          |
| -------------------------------------------------------------------------- | ----------------- | --------------- |
| [`KeyboardTriggerBinding`](/Forge/docs/api/classes/KeyboardTriggerBinding) | `triggerBindings` | `TriggerAction` |
| [`KeyboardHoldBinding`](/Forge/docs/api/classes/KeyboardHoldBinding)       | `holdBindings`    | `HoldAction`    |
| [`KeyboardAxis1dBinding`](/Forge/docs/api/classes/KeyboardAxis1dBinding)   | `axis1dBindings`  | `Axis1dAction`  |
| [`KeyboardAxis2dBinding`](/Forge/docs/api/classes/KeyboardAxis2dBinding)   | `axis2dBindings`  | `Axis2dAction`  |

Keys are [`KeyCode`](/Forge/docs/api/type-aliases/KeyCode) values from
[`keyCodes`](/Forge/docs/api/variables/keyCodes) (`keyCodes.w`,
`keyCodes.space`, `keyCodes.arrowUp`, ...), which are
[`KeyboardEvent.code`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
values: they name a physical key position, whatever the keyboard layout.

```ts
import {
  KeyboardAxis2dBinding,
  KeyboardHoldBinding,
  KeyboardTriggerBinding,
  buttonMoments,
  keyCodes,
} from '@forge-game-engine/forge/input';

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

A trigger binding fires its action when its key goes down
(`buttonMoments.down`) or comes up (`buttonMoments.up`). The browser's
repeated `keydown` events for a held key are ignored, so a held key reports
once when it goes down and once when it comes up.

An axis binding reports `+1` for each held positive key (north and east on
an `Axis2dAction`) and `-1` for each held negative key (south and west).
North is `+y`, matching the engine's Y-up world.

### Binding several keys to one action

Several bindings on one source can target the same action, for example WASD
and the arrow keys on one `Axis2dAction`. The source sums every axis
binding for the action and clamps the result to `-1` to `1` (per component
for an `Axis2dAction`), so opposite keys held together read `0`, and two
keys for the same direction read `1`. A hold is held while any of its keys
is held.

Bindings on other sources for the same action are combined by the
`InputManager` (see
[Combining input from several sources](./actions.md#combining-input-from-several-sources)).

## Typing into editable elements

A key typed into an `<input>`, `<textarea>`, `<select>` or
`contentEditable` element, including one inside a shadow root, isn't
reported for any binding, and neither is its release. A key that went down
outside the element is still released when its `keyup` happens in the
element. This applies to HTML forms on the page and to Forge's own
[text fields](../ui/text-input.md).

## Stopping the source

[`stop()`](/Forge/docs/api/classes/KeyboardInputSource#stop) removes the
source's `keydown` and `keyup` listeners from `globalThis` and releases
every key it was holding. The listeners stay attached until `stop()` is
called, so call it when the source is no longer needed, for example when a
test removes its game.

```ts
keyboard.stop();
```
