---
sidebar_position: 9
---

# Panels

[`createUiPanel`](/Forge/docs/api/functions/createUiPanel) builds the base
visual container of the UI stack: one entity with a
[`UiTransformEcsComponent`](/Forge/docs/api/interfaces/UiTransformEcsComponent)
and a [`UiRenderableEcsComponent`](/Forge/docs/api/interfaces/UiRenderableEcsComponent).
Everything else, buttons, checkboxes, sliders, scroll groups, is a panel (or
several panels) with extra components and behaviour layered on top. Reach
for a bare panel for backgrounds, dialog frames, dividers, list rows, or
anything else that's purely visual or purely a layout container.

```ts
import { createUiPanel, createUiRenderable } from '@forge-game-engine/forge/ui';
import { Color } from '@forge-game-engine/forge/rendering';

const panelRenderable = createUiRenderable(renderContext);

const { entity, destroy } = createUiPanel(world, {
  renderable: panelRenderable,
  rect: { x: 0, y: 0, width: 320, height: 200 },
  parent: canvasEntity,
  tintColor: new Color(0.12, 0.12, 0.16, 1),
  cornerRadius: 8,
});
```

Call `destroy()` on the returned handle when removing the panel, rather than
calling `world.removeEntity` directly; see [Composing Widgets](./composing-widgets.md)
for why this matters once a panel is interactable.

## When you need more than a bare panel

A bare panel (no options beyond layout and style) is the right choice when
the element never reacts to the pointer or keyboard, a background plate, a
divider line, a static icon backdrop. As soon as an element needs to
respond to hover, clicks, or focus, opt in with the `clip`, `interactable`,
and `focusable` flags rather than reaching for a more specific widget that
doesn't otherwise fit; a clickable card in a list, for example, is often
just `createUiPanel` with `interactable: true` and a child label, not a
custom widget.

## The `clip` / `interactable` / `focusable` flags

All three default to `false`, since a purely decorative panel doesn't need
any of the components they attach:

- `clip: true` attaches a [`UiClipEcsComponent`](/Forge/docs/api/interfaces/UiClipEcsComponent)
  so descendants are clipped to this panel's rect. See
  [Clipping and Masking](./clipping-and-masking.md).
- `interactable: true` attaches `UiInteractableEcsComponent` and
  `UiStateEcsComponent`, so the panel participates in pointer hit-testing
  and exposes hover/press/click state and events.
- `focusable: true` attaches `UiFocusableEcsComponent` (with the given
  `tabIndex`) **and implies `interactable`**, so a focusable panel is always
  also interactable even if you don't pass `interactable: true` yourself.

```ts
// Hoverable and clickable, but not reachable via Tab.
const card = createUiPanel(world, {
  renderable,
  rect: { x: 0, y: 0, width: 240, height: 80 },
  parent: listEntity,
  interactable: true,
  stateStyles: { hover: { tintColor: hoverTint } },
});

// card.parts is {}, a bare panel has no named child parts.
```

## Gotcha: `interactable` without `focusable` is mouse-only

`interactable: true` alone makes a panel hoverable and clickable by pointer,
but it is **not** reachable by Tab and cannot receive keyboard focus, since
tab order comes entirely from `UiFocusableEcsComponent`. A panel built this
way silently excludes keyboard and switch-input users from whatever action
its `onClick`-equivalent state event triggers.

```ts
// Wrong: mouse users can click this, keyboard users can never reach it.
createUiPanel(world, { renderable, interactable: true, rect, parent });

// Right: focusable: true (which already implies interactable) makes the
// panel reachable via Tab and activatable with Enter/Space.
createUiPanel(world, { renderable, focusable: true, tabIndex: 0, rect, parent });
```

If the element is meant to be clicked by anyone, prefer
[`createUiButton`](./buttons.md) instead of a focusable panel with a
hand-rolled click handler; it already wires up the label, the
keyboard-activate path, and the disabled/`blocksPointer` interaction
described in [Buttons](./buttons.md).

## Common mistake

Passing both `interactable: false` and `focusable: true` and expecting the
panel to stay mouse-inert. `focusable: true` always attaches the
interaction components regardless of what `interactable` is set to, there is
no way to be keyboard-focusable but pointer-inert through `createUiPanel`'s
options; build that case from [`createUiElement`](./composing-widgets.md)
directly if you ever need it.

See [Default Styling](./default-styling.md) for the tint/border/corner-radius/
opacity fields, and [Interaction and Events](./interaction-and-events.md) for
how the hover/press/focus state machine and its events work once
`interactable` or `focusable` is set.
