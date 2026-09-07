---
sidebar_position: 7
---

# Canvas Groups

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
by `createUiCanvasGroupEcsSystem`, registered automatically by
`createUiCanvas`) on top of - not instead of - each element's own
`tintColor`/`color` alpha, so a half-transparent overlay still darkens
further under a faded group. `interactable`/`blocksRaycasts` are combined
the same way but read on demand by the raycast/interaction/navigation
systems, ANDed with each descendant's own
`UiInteractableEcsComponent.interactable`/`blocksRaycasts`.

Nested groups multiply/AND together up the parent chain. Set
`ignoreParentGroups: true` on a group to keep it (and its own descendants)
fully opaque and interactive even while an ancestor group fades or disables
the rest of the screen - useful for a modal's own close button.

Only a label's *fill* inherits a group's alpha - its `outlineColor`/
`shadowColor` text effects don't currently fade with it, a known
limitation.
