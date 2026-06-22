---
sidebar_position: 12
---

# Sliders

[`createUiSlider`](/Forge/docs/api/functions/createUiSlider) assembles three
panels, a track, a fill that grows toward the current value, and a
draggable knob, plus a [`UiSliderEcsComponent`](/Forge/docs/api/interfaces/UiSliderEcsComponent)
holding the value and range. Unlike buttons and checkboxes, a slider needs
a dedicated system to actually respond to drag, track clicks, and keyboard
input: register [`createUiSliderEcsSystem`](/Forge/docs/api/functions/createUiSliderEcsSystem)
**after** the layout system, or the knob renders in the right place but
never moves.

```ts
import {
  createUiSlider,
  createUiSliderEcsSystem,
  createUiRenderable,
} from '@forge-game-engine/forge/ui';

const trackRenderable = createUiRenderable(renderContext);
const fillRenderable = createUiRenderable(renderContext);
const knobRenderable = createUiRenderable(renderContext);

world.addSystem(createUiSliderEcsSystem(inputManager));

const volumeSlider = createUiSlider(world, {
  renderable: trackRenderable,
  fillRenderable,
  knobRenderable,
  knobWidth: 16,
  knobHeight: 16,
  rect: { x: 0, y: 0, width: 220, height: 8 },
  parent: settingsPanel,
  min: 0,
  max: 100,
  step: 1,
  value: 75,
  onChange: (event) => audio.setVolume(event.value / 100),
});
```

Call `volumeSlider.destroy()` to remove it; this tears down the fill and
knob child entities along with the track, and clears every listener
registered on `slider` and `knobState`. See
[Composing Widgets](./composing-widgets.md) for why a manual entity removal
would leak those listeners.

## Value clamping and stepping

The initial `value` is clamped to `[min, max]` at creation, so passing a
value outside the range doesn't throw, it silently snaps to whichever bound
it exceeded. During interaction, every value change goes through the same
clamp-then-snap path: clamped to `[min, max]` first, then snapped to the
nearest multiple of `step` relative to `min` (when `step` is set), then
clamped again in case stepping pushed it back outside the range. Leave
`step` `undefined` for a continuous slider; a `step` of `0` or less is
treated the same as `undefined` (no snapping), not as an error.

## Reading the value and subscribing to changes

Read the current value directly off the data component:

```ts
volumeSlider.slider.value;
```

Subscribe via the three events the slider raises, either as constructor
options (`onChange`, `onChangeStart`, `onChangeEnd`) or through
`events`/the `slider` component directly (the same
`ParameterizedForgeEvent` either way):

- `onChange` fires every time the value actually changes, during a drag,
  on a track click, or per keyboard step, not on every frame the knob is
  merely held.
- `onChangeStart` fires once when an interaction begins (drag press or the
  first keyboard step), `onChangeEnd` once when it ends (drag release or
  immediately after that same keyboard step). Use the start/end pair to
  show a live value tooltip only while the user is actively dragging.

```ts
volumeSlider.events.onChangeStart.registerListener(() => showValueTooltip());
volumeSlider.events.onChangeEnd.registerListener(() => hideValueTooltip());
```

## Keyboard interaction

With the knob focused, the arrow key matching the slider's `orientation`
(left/right for `'horizontal'`, up/down for `'vertical'`) adjusts the value
by `step`, or by 10% of the `min`-`max` range when `step` is `undefined`.
This is wired through the same `ui.navigateLeft`/`Right`/`Up`/`Down`
actions [`registerUiInputActions`](/Forge/docs/api/functions/registerUiInputActions)
already registers for focus traversal elsewhere in the UI stack, so no
extra setup is needed for arrow-key stepping beyond registering the slider
system itself.

**Home/End jump-to-bounds is not wired up by `registerUiInputActions`.**
The slider system listens for trigger actions named `uiSliderHomeActionName`
(`'ui.sliderHome'`) and `uiSliderEndActionName` (`'ui.sliderEnd'`) to jump
straight to `min`/`max`, but nothing in the engine registers or binds those
two action names by default; `registerUiInputActions` only wires up
`ui.inputHome`/`ui.inputEnd` for input boxes, a different pair of action
names entirely. If you want Home/End support on a slider, register and bind
them yourself:

```ts
import {
  TriggerAction,
  KeyboardTriggerBinding,
  buttonMoments,
  keyCodes,
} from '@forge-game-engine/forge/input';
import {
  uiSliderHomeActionName,
  uiSliderEndActionName,
} from '@forge-game-engine/forge/ui';

const sliderHome = new TriggerAction(uiSliderHomeActionName, 'ui');
const sliderEnd = new TriggerAction(uiSliderEndActionName, 'ui');

inputManager.addTriggerActions(sliderHome, sliderEnd);

keyboardSource.triggerBindings.add(
  new KeyboardTriggerBinding(sliderHome, keyCodes.home, buttonMoments.down),
);
keyboardSource.triggerBindings.add(
  new KeyboardTriggerBinding(sliderEnd, keyCodes.end, buttonMoments.down),
);
```

Without this, pressing Home or End while a slider's knob is focused simply
does nothing, it doesn't throw or fall through to another action, since the
system's internal `tryTrigger` helper treats a missing action the same as
one that exists but isn't currently triggered.

## Gotchas

- **The track is interactable, separately from the knob.** Clicking
  anywhere on the track (not the knob itself) jumps the value to that
  position; this only happens when the knob isn't already being dragged,
  so a fast click-drag-release sequence can't double-apply a track-click
  jump on top of the drag's final position.
- **`knobWidth`/`knobHeight` are required, not optional with a default.**
  They're used to centre the knob on the normalised value position via
  `offsetMin`/`offsetMax`, there's no fallback size; omitting them is a
  type error, not a runtime default.
- **Vertical sliders still use `rect`'s `width`/`height` for the track's
  own size**, only the fill and knob axis interpretation changes with
  `orientation: 'vertical'`. Give a vertical slider a tall, narrow `rect`
  yourself, the orientation flag doesn't transpose the track's dimensions
  for you.

See [Checkboxes](./checkboxes.md) for the boolean counterpart to a
continuous value, and [Composing Widgets](./composing-widgets.md) for the
`UiWidgetHandle` shape `slider`/`knobState`/`parts` follow.
