# Input

Forge's input system maps keyboard, mouse and gamepad input onto named,
game-defined actions, such as "move" or "jump". Game code reads an action's
state instead of checking keys or buttons. Every action belongs to an input
group, and only the actions in the active group respond to input.

The input system is made of:

- [Actions](./actions.md): a
  [`TriggerAction`](/Forge/docs/api/classes/TriggerAction),
  [`HoldAction`](/Forge/docs/api/classes/HoldAction),
  [`Axis1dAction`](/Forge/docs/api/classes/Axis1dAction) or
  [`Axis2dAction`](/Forge/docs/api/classes/Axis2dAction) holds the state of
  one named input.
- [`InputManager`](/Forge/docs/api/classes/InputManager): holds the
  actions and the active input group, and sets each action's state from
  what its input sources report.
- Input sources: a [`KeyboardInputSource`](./keyboard.md),
  [`MouseInputSource`](./mouse.md) or
  [`GamepadInputSource`](./gamepad.md) reads one device and reports the
  state of its bindings to an `InputManager`.
- Bindings: a binding connects one key, button, stick or the cursor on a
  source to an action. Each source has one binding class per action type.
- [`registerInputs`](/Forge/docs/api/functions/registerInputs): creates an
  `InputManager` on an entity in an [`EcsWorld`](../ecs/world.md), adds
  actions to it, and adds the systems that update and reset it every frame.
- [Text entry](./text-entry.md): a hidden HTML `<input>` that receives
  typed text, separate from actions.

## Setting up input

Create the actions, pass them to `registerInputs`, then create a source and
bind the actions on it:

```ts
import {
  Axis2dAction,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
  TriggerAction,
  buttonMoments,
  keyCodes,
  registerInputs,
} from '@forge-game-engine/forge/input';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, time } = createGame('game-container');

const move = new Axis2dAction('move');
const jump = new TriggerAction('jump');

const inputManager = registerInputs(world, time, {
  axis2dActions: [move],
  triggerActions: [jump],
});

const keyboard = new KeyboardInputSource(inputManager);

keyboard.axis2dBindings.add(
  new KeyboardAxis2dBinding(
    move,
    keyCodes.w,
    keyCodes.s,
    keyCodes.d,
    keyCodes.a,
  ),
);
keyboard.triggerBindings.add(
  new KeyboardTriggerBinding(jump, keyCodes.space, buttonMoments.down),
);
```

`registerInputs` adds the input manager to the world as a singleton
component (see [Singleton components](../ecs/world.md#singleton-components)),
so a system can read it with `world.getSingleton(inputsId).inputManager`.
Calling it twice for one world throws.

`registerInputs` doesn't create any input sources. A system then reads
`move.value` and `jump.isTriggered` each frame (see
[Reading action state](./actions.md#reading-action-state)).
