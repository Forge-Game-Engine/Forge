---
sidebar_position: 3
---

# Mouse Input

[`MouseInputSource`](/Forge/docs/api/classes/MouseInputSource) listens for
`mousedown`, `mouseup`, `wheel` and `mousemove` events on a container
element and reports the state of the matching bindings to its
`InputManager`. It also keeps the raw pointer state (position, movement,
scroll and buttons) for code that reads the mouse directly.

## Creating a mouse source

Pass the render canvas as the container, so cursor positions are measured
relative to it:

```ts
import { MouseInputSource } from '@forge-game-engine/forge/input';

const mouse = new MouseInputSource(inputManager, renderContext.canvas);
```

## Binding mouse input to actions

Add a binding to the source's set for the action's type:

| Binding                                                              | Set               | Action                           |
| -------------------------------------------------------------------- | ----------------- | -------------------------------- |
| [`MouseTriggerBinding`](/Forge/docs/api/classes/MouseTriggerBinding) | `triggerBindings` | `TriggerAction`                  |
| [`MouseHoldBinding`](/Forge/docs/api/classes/MouseHoldBinding)       | `holdBindings`    | `HoldAction`                     |
| [`MouseAxis1dBinding`](/Forge/docs/api/classes/MouseAxis1dBinding)   | `axis1dBindings`  | `Axis1dAction` (scroll wheel)    |
| [`MouseAxis2dBinding`](/Forge/docs/api/classes/MouseAxis2dBinding)   | `axis2dBindings`  | `Axis2dAction` (cursor position) |

Buttons are [`MouseButton`](/Forge/docs/api/type-aliases/MouseButton)
values from [`mouseButtons`](/Forge/docs/api/variables/mouseButtons)
(`left`, `middle`, `right`, `extra1`, `extra2`), which match
[`MouseEvent.button`](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button#value).

```ts
import {
  MouseHoldBinding,
  MouseTriggerBinding,
  buttonMoments,
  mouseButtons,
} from '@forge-game-engine/forge/input';

mouse.triggerBindings.add(
  new MouseTriggerBinding(fire, mouseButtons.left, buttonMoments.down),
);

mouse.holdBindings.add(new MouseHoldBinding(aim, mouseButtons.right));
```

Several hold bindings on one action hold it while any of their buttons is
held.

## Binding the cursor position

A [`MouseAxis2dBinding`](/Forge/docs/api/classes/MouseAxis2dBinding) sets
its `Axis2dAction` to the cursor's position on every `mousemove`, and the
action keeps that value until the cursor moves again. By default the value
is the position as a fraction of the container's size, measured from its
center: `(0, 0)` at the center and about `±0.5` at the edges.

```ts
import { MouseAxis2dBinding } from '@forge-game-engine/forge/input';

mouse.axis2dBindings.add(new MouseAxis2dBinding(cursor));
```

The `cursorValueType` option
([`cursorValueTypes.absolute`](/Forge/docs/api/variables/cursorValueTypes))
reports CSS pixels instead, and `cursorOrigin` moves the point the position
is measured from.

:::caution
The cursor position is in screen coordinates: `y` increases downward, so
the cursor above the origin reads a negative `y`. Negate `y` to use the
value in the Y-up world.
:::

The source reads the container's bounds on every `mousemove`, so positions
stay correct after the container is resized, moved or scrolled.

## Binding the scroll wheel

A [`MouseAxis1dBinding`](/Forge/docs/api/classes/MouseAxis1dBinding) sets
its `Axis1dAction` to the frame's wheel movement: the sum of the vertical
wheel delta, in CSS pixels, divided by `100` over the frame's `wheel`
events, clamped to `-1` to `1`. The value lasts one frame: the source reports `0` in its `reset()`
at the end of the frame, so the action reads `0` once the wheel stops.

```ts
import { MouseAxis1dBinding } from '@forge-game-engine/forge/input';

mouse.axis1dBindings.add(new MouseAxis1dBinding(zoom));
```

## Reading the pointer state

Code that reads the mouse without an action, such as a drag gesture or a
debug overlay, reads these properties of the source:

- `position`: the cursor's position in CSS pixels, from the container's
  top-left corner, with `y` increasing downward. On a high-DPI display it's
  smaller than the canvas's drawing-buffer coordinates by
  `RenderContext.pixelRatio`, so convert it against
  `renderContext.cssWidth` and `cssHeight` (see
  [High-DPI displays](../rendering/world-units-and-cameras.md#high-dpi-displays)).
- `delta`: how far the cursor moved since the last frame.
- `scroll`: the wheel movement since the last frame, in CSS pixels: `x` is
  positive scrolling right and `y` positive scrolling down. A wheel that
  reports lines counts 40 pixels per line, and one that reports pages
  counts the container's width or height per page.
- `buttonsDown`, `buttonsHeld` and `buttonsUp`: the
  [`MouseButton`](/Forge/docs/api/type-aliases/MouseButton)s that went down
  this frame, are held, and came up this frame.

`delta`, `scroll`, `buttonsDown` and `buttonsUp` are cleared by the
source's `reset()` at the end of each frame. `position` and `buttonsHeld`
keep their values until they change.

```ts
if (mouse.buttonsHeld.has(mouseButtons.left)) {
  console.log('dragged by', mouse.delta.x, mouse.delta.y);
}
```

## Stopping the source

[`stop()`](/Forge/docs/api/classes/MouseInputSource#stop) removes the
source's event listeners from the container and releases everything it was
holding: buttons, cursor position and wheel input.

```ts
mouse.stop();
```
