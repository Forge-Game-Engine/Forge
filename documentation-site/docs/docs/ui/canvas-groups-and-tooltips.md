---
sidebar_position: 8
---

# Hiding, Fading and Tooltips

A `VisibilityEcsComponent` hides an element and everything under it. A
canvas group fades, disables or makes click-through an element and
everything under it. A tooltip is a panel with a label that is shown while
an interactable element is hovered or focused.

## Hiding and fading

Hiding and fading a UI subtree do different things:

- Hiding sets a [`VisibilityEcsComponent`](../rendering/visibility.md)'s
  `visible` to `false`. The subtree isn't drawn, takes no space in layout
  groups and content size fitters, can't be hit or focused, and loses focus
  and any press in progress.
- Fading sets a canvas group's `alpha`. The subtree is still drawn at the
  faded opacity, including at `0`, keeps its place in the layout, and is
  hit and focused unless the group also sets `interactable` and
  `blocksRaycasts` to `false`.

```ts
import { addVisibilityComponent } from '@forge-game-engine/forge/rendering';

const settingsVisibility = addVisibilityComponent(world, settingsPanel, {
  visible: false,
});

settingsVisibility.visible = true;
```

A canvas group at `alpha: 0` still takes input and layout space. Set the
subtree's `visible` to `false` when it should do neither.

## Fading and disabling a panel

[`addCanvasGroupComponent`](/Forge/docs/api/functions/addCanvasGroupComponent)
adds a [`CanvasGroupEcsComponent`](/Forge/docs/api/type-aliases/CanvasGroupEcsComponent)
to an element. Its values apply to the element and all of its
descendants:

```ts
import { addCanvasGroupComponent } from '@forge-game-engine/forge/ui';

const settingsGroup = addCanvasGroupComponent(world, settingsPanel, {
  alpha: 0.3,
  interactable: false,
  blocksRaycasts: false,
});

// Later, to restore the panel:
settingsGroup.alpha = 1;
settingsGroup.interactable = true;
settingsGroup.blocksRaycasts = true;
```

- `alpha` multiplies the opacity of every sprite and label under the
  group, on top of each one's own color alpha. The canvas group system
  writes it to their `opacityMultiplier` every frame.
- `interactable: false` disables every
  [interactable](buttons-and-interaction.md#disabling-an-element) under
  the group, as if each one's own `interactable` were `false`.
- `blocksRaycasts: false` lets the pointer pass through every element
  under the group.

A group inside another group combines with it: alphas multiply, and an
element is interactable only if every group above it is.

:::note
`alpha` fades a label's text fill, not its outline or shadow.
:::

### Ignoring parent groups

Set `ignoreParentGroups: true` on a group to apply only its own values to
its subtree, for example to keep a dialog's close button enabled while a
group above it disables the rest of the screen.

## Adding a tooltip

[`createTooltip`](/Forge/docs/api/functions/createTooltip) adds a tooltip
to an element that already has a `UiInteractableEcsComponent`, and throws
if it doesn't. It returns the tooltip's `panel` and `label` entities:

```ts
import { createTooltip } from '@forge-game-engine/forge/ui';

const muteTooltip = createTooltip(world, muteToggle.entity, {
  text: 'Mutes all sound effects',
  fontAtlas,
  textSize: 16,
  sprite: tooltipSprite,
  category: uiRenderCategory,
});
```

The tooltip's panel is a child of the element, placed above its top edge,
so it moves with the element. It's shown once the element has been hovered
or focused (or pressed) continuously for
[`TooltipEcsComponent`](/Forge/docs/api/interfaces/TooltipEcsComponent)'s
`showDelayMilliseconds`, and hidden as soon as it isn't. The tooltip system
shows and hides it by writing the panel's `VisibilityEcsComponent.visible`
every frame, so don't set it yourself.

:::caution
The tooltip is drawn in hierarchy order after its element, so elements
that come after the element in hierarchy order, such as siblings parented
after it, are drawn over the tooltip. Add a `DrawOrderEcsComponent` with a
positive `order` to the tooltip's panel (see
[Draw Order](../rendering/draw-order.md)) to draw it over them:

```ts
import { addDrawOrderComponent } from '@forge-game-engine/forge/rendering';

addDrawOrderComponent(world, muteTooltip.panel, { order: 1 });
```

:::
