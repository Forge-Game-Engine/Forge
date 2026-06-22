---
sidebar_position: 10
---

# Buttons

[`createUiButton`](/Forge/docs/api/functions/createUiButton) assembles a
background panel with a centred text label and wires up the full
interaction lifecycle: hover, press, focus, disabled styling, and a single
`onClick` callback that fires from either input modality.

```ts
import { createUiButton, createUiRenderable } from '@forge-game-engine/forge/ui';

const buttonRenderable = createUiRenderable(renderContext);

const button = createUiButton(world, {
  renderable: buttonRenderable,
  renderContext,
  font,
  rect: { x: -80, y: -24, width: 160, height: 48 },
  parent: canvasEntity,
  label: 'Save changes',
  onClick: () => save(),
});
```

Call `button.destroy()` when removing it; this tears down both the
background entity and the child label entity created internally, and clears
every state listener the factory registered. See
[Composing Widgets](./composing-widgets.md) for why a manual
`world.removeEntity(button.entity)` is not equivalent.

## The label child entity and `setLabel`

The visible text is a separate child entity, created internally with
[`createUiText`](/Forge/docs/api/functions/createUiText) and exposed as both
`button.labelEntity` and `button.parts.label`. Don't reach into that entity
to change the text directly; use `setLabel`, which updates the text
component's string and marks it dirty so the text system reshapes it on the
next frame:

```ts
button.setLabel('Saving...');
```

`labelPadding` (`[top, right, bottom, left]`) controls the inset between the
button's edges and the label's stretch-anchored rect; it's the simplest way
to keep label text from touching a rounded or bordered edge without
recomputing the button's own rect.

## `onClick` fires for both pointer and keyboard

`onClick` is registered on the button's `UiStateEcsComponent.onClick` event,
which the state and keyboard-nav systems raise identically whether the
button was clicked with the pointer or activated with `ui.activate`
(Enter/Space) while focused:

```ts
button.state.onClick.registerListener((event) => {
  console.log(event.source); // 'pointer' or 'keyboard'
});
```

`button.events.onClick` is the same event, exposed through the
`UiWidgetHandle` convention; use whichever reads better at the call site.

Don't write separate pointer-click and keyboard-activate handlers, the
single `onClick` option (or `events.onClick` / `state.onClick` for direct
subscription) already covers both, and `event.source` tells you which one
fired if the distinction matters.

## Toggle mode

Setting `toggle: true` latches the button's pressed visual state on click
and releases it on the next click, useful for a mute button, a
filter-active pill, or any control that represents a persistent boolean
rather than a momentary action:

```ts
const muteButton = createUiButton(world, {
  renderable,
  renderContext,
  font,
  rect: { x: 0, y: 0, width: 100, height: 40 },
  parent: toolbar,
  label: 'Mute',
  toggle: true,
  onClick: () => audio.setMuted(muteButton.isToggled()),
});
```

`isToggled()` reflects the latched state; for a non-toggle button it always
returns `false`. `onClick` still fires on every click in toggle mode, after
the internal toggle flag has flipped and the pressed visual has been
applied, so reading `isToggled()` inside the callback gives you the new
state, not the previous one.

## Gotcha: disabled buttons stop blocking the pointer

Setting `disabled: true` (at creation or via the state component) sets
`UiInteractableEcsComponent.blocksPointer` to `false` on top of disabling
the button itself. This is deliberate: a disabled button still occupies
layout space, but it should not steal hover from whatever is rendered
underneath or behind it in the same screen region, for example a tooltip
trigger layered behind a temporarily-disabled action button. Don't rely on
a disabled button to block clicks on elements behind it, if you need an
input-blocking overlay, use a dedicated panel with `interactable: true` and
no `disabled` state instead.

```ts
// Wrong: assumes the disabled button still shields a hidden form behind it.
createUiButton(world, { ..., disabled: true });

// Right: an explicit blocking panel if you need to prevent interaction with
// what's underneath while the button is disabled.
createUiPanel(world, { renderable: overlayRenderable, interactable: true, rect, parent });
```

See [Panels](./panels.md) for the lower-level container buttons are built
from, and [Default Styling](./default-styling.md#per-state-styling) for how
`stateStyles` overrides hover/pressed/focused/disabled visuals.
