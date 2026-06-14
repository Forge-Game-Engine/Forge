# Input

Forge's input system maps raw browser input (keyboard keys, mouse buttons,
cursor position, scroll) onto named, game-defined actions, so gameplay code
asks "is the player moving" or "did the player just jump" instead of
checking key codes directly. Actions belong to an input group, so you can
swap which inputs are "live", for example disabling gameplay actions while a
pause menu is open, without re-binding anything.

Core concepts:

- [`InputManager`](/Forge/docs/api/classes/InputManager): owns the set of
  actions, the active input group, and drives the per-frame update/reset.
- `InputAction`: one of `TriggerAction`, `HoldAction`, `Axis1dAction`, or
  `Axis2dAction`. See [Actions and Input Groups](./actions.md).
- `InputSource`: reads raw browser events and dispatches to bound actions.
  Forge ships
  [`KeyboardInputSource`](/Forge/docs/api/classes/KeyboardInputSource) and
  [`MouseInputSource`](/Forge/docs/api/classes/MouseInputSource).
- `InputBinding`: connects a specific key, button, or axis on a source to an
  action.
- [`registerInputs`](/Forge/docs/api/functions/registerInputs): ECS
  integration that creates an `InputManager` and wires up the systems that
  update and reset it every frame.

Guides in this section:

- [Actions and Input Groups](./actions.md): the four action types, when to
  use each, and switching the active group.
- [Keyboard Input](./keyboard.md): `KeyboardInputSource` and its bindings.
- [Mouse Input](./mouse.md): `MouseInputSource`, cursor position, and scroll.

## Quick Start

[`registerInputs`](/Forge/docs/api/functions/registerInputs) creates the
`InputManager`, registers any actions you pass it, and adds the ECS systems
that call `inputManager.update()` and `inputManager.reset()` each frame. It
does not create any input sources, so create a
[`KeyboardInputSource`](/Forge/docs/api/classes/KeyboardInputSource) (or
[`MouseInputSource`](/Forge/docs/api/classes/MouseInputSource)) yourself and
add bindings to it:

```ts
import {
  Axis2dAction,
  TriggerAction,
  actionResetTypes,
  buttonMoments,
  keyCodes,
  registerInputs,
  KeyboardAxis2dBinding,
  KeyboardInputSource,
  KeyboardTriggerBinding,
} from '@forge-game-engine/forge/input';
import { createGame } from '@forge-game-engine/forge/utilities';

const { world, time } = createGame('game-container');

// `noReset` keeps the axis value while a direction key is held down, see
// "Actions and Input Groups" for why this matters.
const move = new Axis2dAction('move', 'game', actionResetTypes.noReset);
const jump = new TriggerAction('jump');

const inputManager = registerInputs(world, time, {
  axis2dActions: [move],
  triggerActions: [jump],
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
```

A system then reads the actions' current values, the same way it would read
any other component:

```ts
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { positionId, type PositionEcsComponent } from '@forge-game-engine/forge/common';

const playerMovementSystem: EcsSystem<[PositionEcsComponent]> = {
  query: [positionId],
  run: (result) => {
    const [position] = result.components;

    position.local.x += move.value.x * 100 * time.deltaTimeInSeconds;
    position.local.y += move.value.y * 100 * time.deltaTimeInSeconds;

    if (jump.isTriggered) {
      // apply a jump impulse, play a sound, etc.
    }
  },
};

world.addSystem(playerMovementSystem);
```

`jump.isTriggered` is only `true` for the single frame after the key is
pressed: [`registerInputs`](/Forge/docs/api/functions/registerInputs) adds a
reset system that clears trigger actions at the end of every frame.
