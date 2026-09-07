---
sidebar_position: 8
---

# Tooltips

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
(registered automatically by `createUiCanvas`) only ever toggles it
visible/hidden, never repositions it. It appears while the source reads
`hover` or `pressed` under
[`deriveUiInteractionVisualState`](/Forge/docs/api/functions/deriveUiInteractionVisualState)
- hovered by pointer *or* focused by gamepad/keyboard, matching the rest of
this module's source-agnostic interaction model - continuously for at
least [`TooltipEcsComponent.showDelayMilliseconds`](/Forge/docs/api/interfaces/TooltipEcsComponent)
(defaults to `400`), and hides immediately once that state ends.

A tooltip's draw order still follows its hierarchy position like any other
UI element (see `resolveRect`'s ordering) - for a tooltip that must always
render above every other element regardless of where its source sits in
the tree, create it last, after every other UI element on the canvas.
