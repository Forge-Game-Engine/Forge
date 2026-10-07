---
sidebar_position: 1
---

# Actions and Input Groups

An `InputAction` is a named, game-defined input such as "jump" or "move".
Input sources (a [`KeyboardInputSource`](/Forge/docs/api/classes/KeyboardInputSource),
[`MouseInputSource`](/Forge/docs/api/classes/MouseInputSource) or
[`GamepadInputSource`](/Forge/docs/api/classes/GamepadInputSource)) report
what their bound keys, buttons and sticks are doing, and the
[`InputManager`](/Forge/docs/api/classes/InputManager) derives each action's
state from those reports and the active input group. Game code reads the
action, not the keys or buttons bound to it.

## Action types

- [`TriggerAction`](/Forge/docs/api/classes/TriggerAction): `isTriggered`
  is `true` for the frame a bound button goes down (or comes up), and
  `triggerEvent` is raised. Use it for things that happen once per press:
  jump, fire, pause, confirm.
- [`HoldAction`](/Forge/docs/api/classes/HoldAction): `isHeld` is `true`
  while a bound button is held. `holdStartEvent` is raised when the hold
  starts and `holdEndEvent` when it ends. Use it for sprint, charging an
  attack, or aiming.
- [`Axis1dAction`](/Forge/docs/api/classes/Axis1dAction): a `value` from
  `-1` to `1`. Use it for a throttle, zoom, or mouse wheel scroll.
- [`Axis2dAction`](/Forge/docs/api/classes/Axis2dAction): a `Vector2`
  `value`. Keyboard and gamepad bindings report each component from `-1` to
  `1`; a cursor-position binding reports a position (see
  [Mouse Input](./mouse.md)). Use it for movement, look direction, or cursor
  position.

An axis keeps its value until its sources report a different one, so a held
key, stick or cursor position reads the same value every frame until it
changes.

## Creating and binding actions

Create an action with a name and, optionally, an input group (default
`'game'`). Pass it to
[`registerInputs`](/Forge/docs/api/functions/registerInputs), which adds it
to the `InputManager`, then bind it on one or more sources:

```ts
import {
  Axis2dAction,
  TriggerAction,
  registerInputs,
} from '@forge-game-engine/forge/input';

const move = new Axis2dAction('move');
const pause = new TriggerAction('pause');

const inputManager = registerInputs(world, time, {
  axis2dActions: [move],
  triggerActions: [pause],
});
```

[Keyboard Input](./keyboard.md), [Mouse Input](./mouse.md) and
[Gamepad Input](./gamepad.md) cover each source's bindings. An action
created after `registerInputs` is added with
`inputManager.addTriggerActions`, `addHoldActions`, `addAxis1dActions` or
`addAxis2dActions`.

A source reporting for an action that isn't added to its `InputManager`
throws an error.

## Reading action state

Read an action's state in a system:

```ts
if (jump.isTriggered) {
  /* ... */
}

if (sprint.isHeld) {
  /* ... */
}

const zoomAmount = zoom.value; // Axis1dAction: number, -1..1
const direction = move.value; // Axis2dAction: Readonly<Vector2>
```

Or register a listener on an action's events:

```ts
move.valueChangeEvent.registerListener((value) => {
  console.log('move changed to', value.x, value.y);
});

jump.triggerEvent.registerListener(() => {
  console.log('jump triggered');
});
```

`valueChangeEvent`, `holdStartEvent` and `holdEndEvent` are raised only
when the action's state changes. `Axis2dAction.value` is updated in place,
so copy it to keep a value from an earlier frame.

Actions are read-only. The `InputManager` is the only writer of their
state.

[`registerInputs`](/Forge/docs/api/functions/registerInputs) adds a system
that calls [`inputManager.reset()`](/Forge/docs/api/classes/InputManager#reset)
after the game's systems run. It sets every `TriggerAction`'s `isTriggered`
back to `false`, clears every `Axis2dAction`'s `presses`, and calls `reset`
on each source added with `inputManager.addResettable`. A source's `reset`
reports `0` for input that only lasts one frame, such as a mouse wheel
turn.

### Reading presses of an axis

`value` is the axis's state when it's read, so a key pressed and released
between two frames never shows in it. To act on presses rather than on
state, such as moving through a menu one step per press, read an
`Axis2dAction`'s
[`presses`](/Forge/docs/api/classes/Axis2dAction#presses): the value the
axis had each time its length reached
[`axisPressThreshold`](/Forge/docs/api/variables/axisPressThreshold) (`0.5`)
this frame, oldest first.

```ts
for (const press of move.presses) {
  stepMenuSelection(press);
}
```

Holding the axis past the threshold is one press, on the frame it crossed.
A tap shorter than a frame is one press, and two taps in one frame are two.

## Combining input from several sources

One action can be bound on several sources, for example a "move" axis on
the keyboard and a gamepad stick, or a "shoot" hold on Space and the left
mouse button.

Each source first combines its own bindings for an action: its axis
bindings are summed and clamped, and a hold is down while any of its
buttons is. The `InputManager` then combines the sources:

- **Axes** read the report with the largest magnitude (for an
  `Axis2dAction`, the largest vector length). On a tie, the axis keeps reading
  the source it already reads. Releasing one source's input leaves the axis
  reading the others.
- **Holds** are held while any source holds them. `holdStartEvent` is
  raised once when the first source starts the hold, and `holdEndEvent`
  once when the last source releases it.
- **Triggers** fire for each press (or release) on any source.

:::caution
A cursor-position binding using `cursorValueTypes.absolute` reports pixel
values, which have a larger magnitude than any `-1` to `1` input. Don't
bind it to the same action as keys or sticks.
:::

## Input groups

Every action belongs to an input group, `'game'` unless set as the second
constructor argument. Only the actions in the active group respond to input.
[`InputManager.setActiveGroup`](/Forge/docs/api/classes/InputManager#setactivegroup)
sets the active group, for example to switch from gameplay to a pause menu:

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

While the active group is `'menu'`, the `'game'` actions read `0` and
aren't held or triggered. Their bindings stay on their sources.

### What happens when the active group changes

The `InputManager` keeps every source's latest report for every action,
whichever group is active. When `setActiveGroup` changes the group:

- **The deactivated group's actions are released.** Its axes read `0` and
  its holds end, raising `valueChangeEvent` and `holdEndEvent` where the
  state changes.
- **The activated group's axes read the current input.** A movement key
  held through a pause menu moves the player as soon as the game group is
  active again.
- **The activated group's holds need a new press.** A hold starts only on a
  press made while its group is active. A button that is already down when
  its group becomes active doesn't start the hold until it is released and
  pressed again. So one button bound in two groups, for example "submit" in
  a menu and "shoot" in the game, doesn't start the game's hold with the
  press that closed the menu.
- **Triggers don't carry over.** A press or release while a trigger's group
  is inactive is dropped. An up-moment trigger fires only for a press made
  while its group was active and still is.

Calling `setActiveGroup` with the group that is already active does nothing.

## Writing a custom input source

An input source is any object that implements
[`InputSource`](/Forge/docs/api/interfaces/InputSource) (a `name`) and
reports its state to the `InputManager`:

- [`setAxis1dInput(source, action, value)`](/Forge/docs/api/classes/InputManager#setaxis1dinput)
  and
  [`setAxis2dInput(source, action, x, y)`](/Forge/docs/api/classes/InputManager#setaxis2dinput)
  record the source's current value for an axis.
- [`setHoldInput(source, action, isDown)`](/Forge/docs/api/classes/InputManager#setholdinput)
  records whether the source is holding the action.
- [`setTriggerInput(source, binding, isDown)`](/Forge/docs/api/classes/InputManager#settriggerinput)
  records a trigger binding's button going down or up. The binding is a
  [`TriggerInputBinding`](/Forge/docs/api/interfaces/TriggerInputBinding):
  the action and the `moment` it fires on.
- [`removeSourceInput(source)`](/Forge/docs/api/classes/InputManager#removesourceinput)
  forgets everything the source reported, releasing what it held.

```ts
import {
  buttonMoments,
  type InputSource,
  type TriggerInputBinding,
} from '@forge-game-engine/forge/input';

const touchControls: InputSource = { name: 'touch' };

const jumpBinding: TriggerInputBinding = {
  action: jump,
  moment: buttonMoments.down,
  displayText: 'Tap',
};

// The stick moved.
inputManager.setAxis2dInput(touchControls, move, stickX, stickY);

// The jump button went down, then up.
inputManager.setTriggerInput(touchControls, jumpBinding, true);
inputManager.setTriggerInput(touchControls, jumpBinding, false);

// The stick was released.
inputManager.setAxis2dInput(touchControls, move, 0, 0);
```

A source reports state, not changes: report an axis's current value, and
report `0` or `false` when the input is released. Reporting the same state
again changes nothing, so a polled source can report every frame. Pass the
same binding object for a trigger's down and up reports.

A source that polls a device registers itself with
`inputManager.addUpdatable`, and the manager calls its `update` every frame.
A source whose input only lasts one frame registers itself with
`inputManager.addResettable`, and reports `0` in its `reset`. When the
source stops, it calls `removeSourceInput`.

## Removing an action

`inputManager.removeTriggerAction`, `removeHoldAction`,
`removeAxis1dAction` and `removeAxis2dAction` remove an action from the
manager, forget its sources' input and release it. Remove the action's
bindings from its sources first, since a source reporting for a removed
action throws an error.
