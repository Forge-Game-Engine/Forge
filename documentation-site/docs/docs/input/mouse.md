---
sidebar_position: 3
---

# Mouse Input

[`MouseInputSource`](/Forge/docs/api/classes/MouseInputSource) listens for
`mousedown`, `mouseup`, `wheel`, and `mousemove` events on a container
element and dispatches to whichever bindings match. Pass the render canvas
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
  actionResetTypes,
  buttonMoments,
  mouseButtons,
  MouseAxis2dBinding,
  MouseInputSource,
  MouseTriggerBinding,
} from '@forge-game-engine/forge/input';

const aim = new Axis2dAction('aim', 'game', actionResetTypes.noReset);
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
  `value` is the cursor's position in pixels, minus `cursorOrigin *
containerSize`. With the default origin, this is the pixel offset from the
  container's center, useful for a reticle or look-offset in screen pixels.

```ts
import { cursorValueTypes } from '@forge-game-engine/forge/input';

// Pixel offset from the center of the canvas, e.g. for an aim reticle.
const reticle = new Axis2dAction('reticle', 'game', actionResetTypes.noReset);

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

:::caution
Like keyboard axes, cursor position needs `actionResetTypes.noReset` on the
bound `Axis2dAction`, see
[Actions and Input Groups](./actions.md#reset-behavior-zero-vs-noreset).
`MouseAxis2dBinding` only calls `set()` on `mousemove`, so with the default
`actionResetTypes.zero` the value snaps back to `Vector2.zero` on the next
frame's reset, even while the cursor sits still.
:::

[`MouseAxis1dBinding`](/Forge/docs/api/classes/MouseAxis1dBinding) (scroll
wheel) sets the bound `Axis1dAction`'s value to `event.deltaY / 100` on each
`wheel` event, roughly ±1 per scroll click. Unlike cursor position, this is
naturally a "delta this frame" value, so the default
`actionResetTypes.zero` is correct here, the value goes back to `0` once
scrolling stops.

[`MouseInputSource`](/Forge/docs/api/classes/MouseInputSource) captures the
container's `getBoundingClientRect()` once, in its constructor, and reuses
it for every `mousemove` event. If the container is resized or
repositioned afterward (a responsive canvas, a window resize), cursor
positions will be computed against the stale rect. Recreate the
`MouseInputSource` after such a resize if precise cursor coordinates matter.

[`MouseInputSource.stop()`](/Forge/docs/api/classes/MouseInputSource#stop)
removes its event listeners from the container and unregisters it from the
`InputManager`. Call it when the source is no longer needed.
