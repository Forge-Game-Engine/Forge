---
sidebar_position: 3
---

# Mouse Input

[`MouseInputSource`](/Forge/docs/api/classes/MouseInputSource) listens for
`mousedown`, `mouseup`, `wheel`, and `mousemove` events on a container
element and reports the state of the matching bindings to its
`InputManager`. Pass the render canvas
as the container so cursor positions are measured relative to it:

```ts
import { MouseInputSource } from '@forge-game-engine/forge/input';

const { renderContext } = createGame('game-container');

const mouse = new MouseInputSource(inputManager, renderContext.canvas);
```

Then add bindings to the matching set on the source. There is one binding
type per action type:

| Binding                                                              | Set               | Action                           |
| -------------------------------------------------------------------- | ----------------- | -------------------------------- |
| [`MouseTriggerBinding`](/Forge/docs/api/classes/MouseTriggerBinding) | `triggerBindings` | `TriggerAction`                  |
| [`MouseHoldBinding`](/Forge/docs/api/classes/MouseHoldBinding)       | `holdBindings`    | `HoldAction`                     |
| [`MouseAxis1dBinding`](/Forge/docs/api/classes/MouseAxis1dBinding)   | `axis1dBindings`  | `Axis1dAction` (scroll wheel)    |
| [`MouseAxis2dBinding`](/Forge/docs/api/classes/MouseAxis2dBinding)   | `axis2dBindings`  | `Axis2dAction` (cursor position) |

Mouse buttons use [`MouseButton`](/Forge/docs/api/type-aliases/MouseButton)
values from
[`mouseButtons`](/Forge/docs/api/variables/mouseButtons) (`left`, `middle`,
`right`, `extra1`, `extra2`), matching
[`MouseEvent.button`](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button#value).

## Worked example: aim and fire

```ts
import {
  Axis2dAction,
  TriggerAction,
  buttonMoments,
  mouseButtons,
  MouseAxis2dBinding,
  MouseInputSource,
  MouseTriggerBinding,
} from '@forge-game-engine/forge/input';

const aim = new Axis2dAction('aim');
const fire = new TriggerAction('fire');

const inputManager = registerInputs(world, time, {
  axis2dActions: [aim],
  triggerActions: [fire],
});

const mouse = new MouseInputSource(inputManager, renderContext.canvas);

mouse.axis2dBindings.add(new MouseAxis2dBinding(aim));

mouse.triggerBindings.add(
  new MouseTriggerBinding(fire, mouseButtons.left, buttonMoments.down),
);
```

## Cursor position: `cursorValueType` and `cursorOrigin`

[`MouseAxis2dBinding`](/Forge/docs/api/classes/MouseAxis2dBinding) converts
the cursor's pixel position within the container into the bound action's
`value`, relative to `cursorOrigin` (a ratio of the container's width/height,
default `(0.5, 0.5)`, the center):

- [`cursorValueTypes.ratio`](/Forge/docs/api/variables/cursorValueTypes)
  (default): `value` is the cursor's position as a fraction of the
  container's size, minus `cursorOrigin`. With the default origin, the
  cursor at the container's center is `(0, 0)`, and the edges are roughly
  `±0.5`.
- [`cursorValueTypes.absolute`](/Forge/docs/api/variables/cursorValueTypes):
  `value` is the cursor's position in CSS pixels, minus `cursorOrigin *
containerSize`. With the default origin, this is the pixel offset from the
  container's center, useful for a reticle or look-offset in screen pixels.

```ts
import { cursorValueTypes } from '@forge-game-engine/forge/input';

// Pixel offset from the center of the canvas, e.g. for an aim reticle.
const reticle = new Axis2dAction('reticle');

mouse.axis2dBindings.add(
  new MouseAxis2dBinding(reticle, {
    cursorValueType: cursorValueTypes.absolute,
  }),
);
```

:::caution
Both axes follow screen coordinates: y increases **downward**, so moving the
mouse toward the top of the container produces a negative y. If you're using
the value to drive a Y-up world (as Forge's physics does), negate y before
applying it.
:::

## Gotchas

`MouseAxis2dBinding` reports the cursor position on every `mousemove`, and
the bound action keeps that value until the cursor moves again.

[`MouseAxis1dBinding`](/Forge/docs/api/classes/MouseAxis1dBinding) (scroll
wheel) reports the sum of `event.deltaY / 100` over the frame's `wheel`
events, roughly ±1 per scroll click (the action clamps it to `[-1, 1]`,
like every `Axis1dAction`). The input lasts one frame: the source reports
`0` again in its `reset()` at the end of the frame, so the action reads
`0` once scrolling stops.

Like every other binding, `MouseAxis1dBinding` and `MouseAxis2dBinding`
only affect their action while its
[input group](./actions.md#input-groups) is active. A cursor-position action
in an inactive group reads `0`, and reads the latest cursor position as soon
as its group becomes active again.

Several `MouseHoldBinding`s on one action hold it while any of their buttons
is held.

[`MouseInputSource`](/Forge/docs/api/classes/MouseInputSource) calls the
container's `getBoundingClientRect()` fresh on every `mousemove` event, so
cursor positions stay correct after the container is resized, scrolled, or
otherwise reflowed (a responsive canvas, a window resize) - no need to
recreate the source afterward.

[`MouseInputSource.stop()`](/Forge/docs/api/classes/MouseInputSource#stop)
removes its event listeners from the container and releases everything it
was holding: buttons, cursor position and wheel input. Call it when the source is no longer needed.

## Raw pointer state: position, delta, scroll, and buttons

Bindings map mouse events onto named actions, but code that wants the raw
device state directly - a UI hit-tester, a drag gesture, a debug overlay -
can read it straight off `MouseInputSource` without an intervening action:

- `position` - the cursor's current position in CSS pixels: Y-down,
  origin at the container's top-left corner. On a high-DPI display this is
  smaller than the canvas's drawing-buffer coordinates by
  `RenderContext.pixelRatio`, so convert it against
  `renderContext.cssWidth`/`cssHeight` (see
  [High-DPI displays](../rendering/world-units-and-cameras.md#high-dpi-displays)).
- `delta` - how far `position` moved since the last tick.
- `scroll` - accumulated `WheelEvent.deltaY` since the last tick.
- `buttonsDown` / `buttonsHeld` / `buttonsUp` - `MouseButton` sets for
  buttons that started being held down this tick, are currently held, and
  stopped being held down this tick, respectively.

`delta`, `scroll`, `buttonsDown`, and `buttonsUp` are per-tick edges that
reset (via `MouseInputSource.reset()`, wired up automatically by
`registerInputs`) once the frame that observed them ends; `position` and
`buttonsHeld` persist across ticks until they next change.

There is no ECS component for this state - hold a reference to the
`MouseInputSource` instance (the same way game code holds a reference to an
`InputManager` or an `InputAction`) and read `.position`/`.delta`/etc.
directly from a system's closure. `position` is deliberately in CSS
pixels, not world space: with more than one camera (for example a dedicated
UI camera layered over the world camera), a single canvas position maps to
a different world position through each camera, so converting is left to
the reader.
