---
sidebar_position: 4
---

# Interaction

Two calls put a working, clickable, gamepad/keyboard-navigable button on
screen:

```ts
const canvas = createUiCanvas(world, renderContext, time, {
  cullingMask: uiRenderCategory,
  // Pointer interaction needs a pointer source; omit it for a
  // gamepad/keyboard-only canvas. MouseInputSource satisfies this directly.
  pointerSource: new MouseInputSource(inputManager, game.container),
  // Optional - both InputActions the same way CameraEcsComponent takes
  // zoomInput/panInput. Omitted, the canvas is still fully clickable, just
  // not focus-navigable.
  submitInput: inputManager.getTriggerAction('ui-submit'),
  navigateInput: inputManager.getAxis2dAction('ui-navigate'),
});

const play = createButton(world, canvas, {
  sprite: panelSprite,
  label: 'Play',
  fontAtlas,
  labelSize: 32,
  labelCategory: uiRenderCategory,
});

play.onInvoke.registerListener(startGame);
```

`createButton` assembles a panel (`createPanel`) with a
[`UiInteractableEcsComponent`](/Forge/docs/api/interfaces/UiInteractableEcsComponent)
and a
[`UiColorTransitionEcsComponent`](/Forge/docs/api/interfaces/UiColorTransitionEcsComponent)
added, plus a centered child label - there's no `ButtonEcsComponent`. Every
piece is independently useful: add `UiInteractableEcsComponent` to any rect
(a toggle, a list row, a close icon) to make it clickable, hoverable, and
focus-navigable without it being a "button" at all.

## Source-agnostic invocation

`onInvoke` is raised the same way whether a pointer click, a gamepad/
keyboard submit, or a script (`interactable.onInvoke.raise()`, or
triggering `submitInput` directly) caused it - the listener can't tell
which. `isHovered` (pointer-only) and `isFocused` (source-agnostic - set by
directional navigation, and by the pointer hovering an element, so the
highlight follows the mouse) stay deliberately distinct; a `wasInvokedThisFrame`
flag is available for polling instead of registering a listener.

## Focus navigation

Every `interactable: true` element is automatically focus-navigable: on the
tick `navigateInput`'s magnitude first crosses a threshold, focus moves to
the nearest candidate on the same canvas in that direction. Add a
[`UiFocusEcsComponent`](/Forge/docs/api/interfaces/UiFocusEcsComponent) to
override the search on specific sides (e.g. to wrap focus from the last
item in a row back to the first). `cancelInput` clears focus; register your
own listener on `cancelInput.triggerEvent` for "close this menu" behavior.

## Hit testing and drag

`createUiRaycastEcsSystem` scans interactables topmost-first (reverse
hierarchy order) each tick, publishing `CanvasEcsComponent.hoveredEntity`/
`isPointerOverUi` - read the latter to gate world interaction ("don't fire
the weapon when the click landed on the pause button"). An element with
`blocksRaycasts: false` is transparent to the scan. A captured press that
moves beyond `dragThreshold` (measured in reference pixels) raises
`onBeginDrag`/`onDrag`/`onEndDrag` instead of `onInvoke` - useful for
building a slider handle or a scrollbar thumb.
