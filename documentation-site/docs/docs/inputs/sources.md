---
sidebar_position: 2
---

# Sources

Actions are physical input devices; for example keyboard, mouse, gamepad etc.

## Source types

### Keyboard Source

The [`KeyboardInputSource`](../../api/classes/KeyboardInputSource.md) listens for keyboard events.

This source will dispatch the following interactions:

#### Keyboard Trigger Interaction

The [`KeyboardTriggerInteraction`](../../api/classes/KeyboardTriggerInteraction.md) passes the following arguments:

* moment - a [`ButtonMoment`](../../api/variables/buttonMoments.md)
* keyCode - a [`KeyCode`](../../api/variables/keyCodes.md)

### Mouse Source

The [`MouseInputSource`](../../api/classes/MouseInputSource.md) listens for mouse events.

This source will dispatch the following interactions:

#### Mouse Trigger Interaction

The [`MouseTriggerInteraction`](../../api/classes/MouseTriggerInteraction.md) passes the following arguments:

* moment - a [`ButtonMoment`](../../api/variables/buttonMoments.md)
* mouseButton - a [`MouseButton`](../../api/variables/mouseButtons.md)

#### Mouse 1D Axis Interaction

The [`MouseAxis1dInteraction`](../../api/classes/MouseAxis1dInteraction.md) passes no arguments.

It sets the [`value`](../../api/classes/Axis1dAction.md#value) to [`deltaY`](https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent/deltaY). 

#### Mouse 2D Axis Interaction

The [`MouseAxis2dInteraction`](../../api/classes/MouseAxis2dInteraction.md) passes no arguments.

It sets the [`value`](../../api/classes/Axis1dAction.md#value) to the x and y value of the cursor, relative to the top-left corner. 