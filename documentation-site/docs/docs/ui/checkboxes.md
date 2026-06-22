---
sidebar_position: 11
---

# Checkboxes

[`createUiCheckbox`](/Forge/docs/api/functions/createUiCheckbox) assembles a
box panel with an inset check-mark panel as its child, and a
[`UiCheckboxEcsComponent`](/Forge/docs/api/interfaces/UiCheckboxEcsComponent)
on the root entity that tracks the checked state. Use it for boolean
settings, multi-select lists, and "I agree" style confirmations, anywhere
the value is a plain on/off rather than a single choice among several
(which is closer to a future radio-group widget than a checkbox).

```ts
import { createUiCheckbox, createUiRenderable } from '@forge-game-engine/forge/ui';
import { Color } from '@forge-game-engine/forge/rendering';

const boxRenderable = createUiRenderable(renderContext);
const checkRenderable = createUiRenderable(renderContext);

const checkbox = createUiCheckbox(world, {
  renderable: boxRenderable,
  checkRenderable,
  rect: { x: 0, y: 0, width: 24, height: 24 },
  parent: formEntity,
  checked: true,
  checkColor: Color.black,
  onChange: (event) => console.log('checked:', event.checked),
});
```

Call `checkbox.destroy()` when removing it; this tears down the check-mark
child entity in addition to the box, and clears every listener the factory
registered on `state` and `checkbox.onChange`. See
[Composing Widgets](./composing-widgets.md) for why this matters more than
it looks.

## Checked state and how it's toggled

`checkbox.checkbox.checked` is the current boolean value, and the check
mark's visibility is just its opacity: `1` when checked, `0` when
unchecked, toggled by the same internal handler rather than swapped for a
different renderable or icon. Both pointer click on the box and the
`ui.activate` keyboard action (Enter/Space) while the box is focused flip
`checked` and raise `onChange`, exactly the same dual-input path
[Buttons](./buttons.md#onclick-fires-for-both-pointer-and-keyboard) use for
`onClick`.

## Reading and observing the value

Read the current value directly off the data component:

```ts
if (checkbox.checkbox.checked) {
  enableAdvancedOptions();
}
```

Subscribe to changes either through the `onChange` constructor option or
the returned handle's `events.onChange` (the same
`ParameterizedForgeEvent`), rather than polling `checked` every frame:

```ts
checkbox.events.onChange.registerListener((event) => {
  // event.entity is the checkbox's root entity, event.checked the new value.
  settings.darkMode = event.checked;
});
```

## Gotchas

- **`checkRenderable` can be the same `Renderable` instance as `renderable`**
  if the box and check mark don't need visually distinct materials, sharing
  batches them together; see [Default Styling](./default-styling.md#sharing-a-renderable-for-batching).
  Give it a separate instance only when the check mark needs a different
  visual treatment than the box (a different shape, a custom shader icon).
- **`disabled: true` blocks toggling, not just styling.** The click handler
  checks `state.disabled` before flipping `checked`, so a disabled checkbox
  neither toggles nor fires `onChange` on click or keyboard activate, it's
  not just a visual dimming.
- **`checkInset` is relative to the box, not a fixed pixel size for the
  check mark.** Changing the box's `rect` without adjusting `checkInset`
  changes how much of the box the check mark fills; for a square box, a
  `checkInset` of roughly 15-20% of the box's side length matches the
  visual weight of the default styling examples in this guide.

## Common mistake

Treating the checkbox's `entity` and the check mark's `checkEntity` as
interchangeable when styling. Tint, border, and corner radius set through
`createUiCheckbox`'s top-level options (`tintColor`, `borderColor`, ...)
apply to the **box**; the check mark only reads `checkColor` and
`checkInset`. To restyle the check mark itself (its corner radius, for
example) update the renderable component on `checkbox.checkEntity`
directly, the factory doesn't expose every check-mark style field as a
separate top-level option.

See [Panels](./panels.md) for the underlying container both the box and the
check mark are built from, and [Sliders](./sliders.md) for a widget that
follows the same track/child-panel composition pattern for a continuous
rather than boolean value.
