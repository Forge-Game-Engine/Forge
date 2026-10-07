---
sidebar_position: 8
---

# Hiding, Fading and Tooltips

## Hiding and fading

A UI subtree can be hidden or faded, and the two do different things:

- **Hiding** sets a
  [`VisibilityEcsComponent`](../rendering/visibility.md)'s `visible` to
  `false`. The subtree isn't drawn, takes no space in layout groups and
  content size fitters, can't be hit or focused, and loses focus and any
  press in progress. Use it for pages, menus and controls that aren't on
  screen.
- **Fading** sets a canvas group's `alpha`. The subtree is still drawn (at
  the faded opacity, including `0`), keeps its place in the layout, and is
  hit and focused as usual unless the group also turns off `interactable`
  and `blocksRaycasts`. Use it for a disabled or dimmed panel, and for
  fading a page in or out.

```ts
const settingsVisibility = addVisibilityComponent(world, settingsPage, {
  visible: false,
});

// Opening the settings page:
settingsVisibility.visible = true;
```

A canvas group at `alpha: 0` still takes input and layout space, so when a
fade out ends, set the subtree's `visible` to `false` too.

## Canvas groups

[`addCanvasGroupComponent`](/Forge/docs/api/functions/addCanvasGroupComponent)
fades, disables, or makes click-through a whole subtree with one component
instead of one per element - the "grey out and disable this panel while a
modal is open" case:

```ts
const settingsPanel = createPanel(world, canvas, {
  anchor: UiAnchor.center({ x: 480, y: 640 }),
  sprite: panelSprite,
});

const settingsGroup = addCanvasGroupComponent(world, settingsPanel, {
  alpha: 0.3,
  interactable: false,
  blocksRaycasts: false,
});

// Later, closing the modal:
settingsGroup.alpha = 1;
settingsGroup.interactable = true;
settingsGroup.blocksRaycasts = true;
```

`alpha` multiplies into every descendant's rendered opacity (written to
`SpriteEcsComponent.opacityMultiplier`/`TextEcsComponent.opacityMultiplier`
by `createUiCanvasGroupEcsSystem`, registered by `registerUiSystems`) on
top of - not instead of - each element's own `tintColor`/`color` alpha, so
a half-transparent overlay still darkens further under a faded group.
`interactable`/`blocksRaycasts` are combined the same way but read on
demand by the raycast/interaction/navigation systems, ANDed with each
descendant's own
`UiInteractableEcsComponent.interactable`/`blocksRaycasts`.

Nested groups multiply/AND together up the parent chain. Set
`ignoreParentGroups: true` on a group to keep it (and its own descendants)
fully opaque and interactive even while an ancestor group fades or disables
the rest of the screen - useful for a modal's own close button.

:::info[Known limitation]
Only a label's *fill* inherits a group's alpha - its `outlineColor`/
`shadowColor` text effects don't currently fade with it.
:::

## Tooltips

[`createTooltip`](/Forge/docs/api/functions/createTooltip) attaches a
floating panel/label to an already-interactable entity, shown after it's
been hovered or focused for a delay:

```ts
const muteToggle = createToggle(world, canvas, { /* ... */ });

createTooltip(world, muteToggle.entity, {
  text: 'Mutes all sound effects',
  fontAtlas,
  textSize: 16,
  sprite: tooltipPanelSprite,
});
```

The tooltip panel is parented directly to the source element, pinned just
above its top edge, so it follows the source automatically as an ordinary
UI child - [`createUiTooltipEcsSystem`](/Forge/docs/api/functions/createUiTooltipEcsSystem)
(registered by `registerUiSystems`) only ever shows or hides it, through the
panel's [`VisibilityEcsComponent`](../rendering/visibility.md) (the label is
the panel's child, so it's hidden with it), and never repositions it. The
system writes the panel's `visible` every frame, so don't set it
yourself. It appears while the source reads `hover` or
`pressed` under
[`deriveUiInteractionVisualState`](/Forge/docs/api/functions/deriveUiInteractionVisualState)
- hovered by pointer *or* focused by gamepad/keyboard, matching the rest of
this module's source-agnostic interaction model - continuously for at
least [`TooltipEcsComponent.showDelayMilliseconds`](/Forge/docs/api/interfaces/TooltipEcsComponent)
(defaults to `400`), and hides immediately once that state ends.

:::info[Known limitation]
A tooltip's draw order still follows its hierarchy position like any other
UI element (see `resolveRect`'s ordering) - for a tooltip that must always
render above every other element regardless of where its source sits in
the tree, create it last, after every other UI element on the canvas.
:::
