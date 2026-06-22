---
sidebar_position: 16
---

# Dropdowns

[`createUiDropdown`](/Forge/docs/api/functions/createUiDropdown) builds a
select/combo-box widget: a trigger button showing the current selection, and
a popup list of options that opens on click. Reach for it for any "choose one
of N" control, a difficulty setting, a language picker, a unit filter, where
a row of buttons or a [slider](./sliders.md) wouldn't fit or wouldn't read
well as a list of discrete named choices.

```ts
import { createUiDropdown, createUiRenderable } from '@forge-game-engine/forge/ui';

const triggerRenderable = createUiRenderable(renderContext);
const optionRenderable = createUiRenderable(renderContext);
const scrollRenderable = createUiRenderable(renderContext);

const difficultyDropdown = createUiDropdown(world, {
  renderable: triggerRenderable,
  optionRenderable,
  scrollRenderable,
  renderContext,
  font,
  rect: { x: 0, y: 0, width: 200, height: 32 },
  parent: canvasEntity,
  canvasEntity,
  options: ['Easy', 'Normal', 'Hard'],
  selectedIndex: 1,
  onChange: (event) => console.log('selected:', event.value),
});
```

## What it's composed of

A dropdown is not a new primitive, it's [`createUiButton`](./buttons.md) (the
trigger) plus a popup panel containing [`createUiScrollGroup`](./scroll-groups.md)
(so a long option list scrolls instead of overflowing) with one
`createUiButton` per option inside the scroll group's content entity. The
factory wires the trigger's click handler to toggle
`UiDropdownEcsComponent.isOpen`, and each option button's `onClick` to update
`selectedIndex`, relabel the trigger, and raise `onChange`. See
[Composing Widgets](./composing-widgets.md) for the general pattern this
follows if you want to build your own composite widget the same way.

The popup is created **eagerly**, parented directly to `canvasEntity` rather
than wherever the dropdown itself lives in the hierarchy, and toggled with
`enabled`/`focusable` flags rather than being created and destroyed on every
open/close. Two consequences follow from this:

- **`canvasEntity` is a required option**, not inferred from `parent`. Pass
  the same canvas entity you used for `createUiCanvas`, since the popup needs
  it both for parenting and so the dropdown system knows which canvas's
  pointer/focus state to read each frame.
- **The popup is immune to ancestor clipping.** A dropdown trigger placed
  inside a scroll group or a clipped panel still opens a popup that renders
  on top of everything else (`popupZIndex` defaults to `9000`), it never gets
  clipped to its parent container's bounds the way an ordinary child would.

## Open/close behaviour

Open and close are driven entirely by reading and writing
`dropdown.isOpen`; [`createUiDropdownEcsSystem`](/Forge/docs/api/functions/createUiDropdownEcsSystem)
detects the transition each frame and does the rest. You can open a dropdown
from your own code the same way the trigger button does, just set the flag:

```ts
difficultyDropdown.dropdown.isOpen = true;
```

On the closed-to-open transition, the system repositions the popup directly
below the trigger's current resolved rect (so it tracks the trigger if the
layout has moved since creation), enables the popup and option renderables,
makes the option buttons focusable, and moves keyboard focus to the
currently selected option. On open-to-close, it reverses all of that and
returns focus to the trigger button. Add the system after the layout system,
the same ordering requirement as every other UI system that reads
`resolvedRect`:

```ts
import { createUiDropdownEcsSystem } from '@forge-game-engine/forge/ui';

world.addSystem(createUiDropdownEcsSystem(inputManager));
```

## Keyboard navigation within the open list

Once a dropdown is open, the option buttons are made focusable and the
system moves focus onto the selected one. From there, navigating between
options reuses the same tab order and arrow-key navigation as any other
focusable widgets, there's no dropdown-specific key handling for moving
between options. See
[Focus and Keyboard Navigation](./focus-and-keyboard-navigation.md) for how
tab order and arrow keys traverse focusable entities; option buttons
participate in that system exactly like any other button once
`focusable` is `true`.

## Closing the popup

While open, the dropdown system checks two conditions every frame, neither
of which goes through `createUiBlurObserver`, the dropdown implements its own
inline checks rather than wiring into the shared blur-policy observer:

- **Escape (`ui.cancel`)** closes the dropdown unconditionally.
- **Click-away**: if the primary pointer button is held and the hovered
  entity is not the trigger, the popup, or one of the option buttons, the
  dropdown closes. Selecting an option also closes it, via the option's own
  `onClick` setting `isOpen = false` directly, independent of this check.

Tabbing or arrow-navigating focus to an entity outside the trigger/popup/
options set also closes the dropdown, checked via the canvas's
`UiFocusEcsComponent.focused`. Closing this way (not just clicking away)
matters for keyboard-only users tabbing past an open dropdown.

## Gotchas

- **`options` is captured once at creation as a copy.** Changing the array
  you originally passed in doesn't update the dropdown; there's no API to
  add/remove options after construction; destroy and recreate the widget if
  the choice set itself changes at runtime, rather than mutating `dropdown.options`.
- **`selectedIndex` out of range falls back silently.** An initial
  `selectedIndex` beyond `options.length - 1` renders the trigger label as
  empty string rather than throwing, since the factory uses
  `optionLabels[initialSelectedIndex] ?? ''`. Validate the index yourself if
  it comes from user data or a save file.
- **The popup's width comes from the trigger, not from the longest option
  label.** `repositionPopup` sets the popup's width to match the trigger
  button's resolved width every time it opens, so a long option label can
  visually overflow or wrap inside a narrow trigger's popup. Size the trigger
  (and therefore the popup) wide enough for your longest expected label.
- **Reuse the same `scrollRenderable` across multiple dropdowns** the same
  way you would for any other scroll group, so their (typically invisible)
  scroll viewport panels batch together rather than each becoming a separate
  draw call.

## Common mistake

```ts
// Wrong: forgetting canvasEntity, or passing a different entity than the
// canvas createUiCanvas returned, leaves the popup with no parent or reads
// the wrong canvas's pointer/focus state.
createUiDropdown(world, { renderable, optionRenderable, scrollRenderable, renderContext, font, options, canvasEntity: someOtherEntity });

// Right: pass the same canvas entity used everywhere else in the scene.
const canvasEntity = createUiCanvas(world, { width, height });
createUiDropdown(world, { renderable, optionRenderable, scrollRenderable, renderContext, font, options, canvasEntity });
```
