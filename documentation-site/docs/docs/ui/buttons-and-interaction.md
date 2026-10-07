---
sidebar_position: 5
---

# Buttons and Interaction

Two calls put a working, clickable, gamepad/keyboard-navigable button on
screen:

```ts
registerUiSystems(world, renderContext, time, {
  // Pointer interaction needs a pointer source; omit it for a
  // gamepad/keyboard-only canvas. MouseInputSource satisfies this directly.
  pointerSource: new MouseInputSource(inputManager, game.container),
});

const canvas = createUiCanvas(world, renderContext, {
  cullingMask: uiRenderCategory,
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

## Hover and press colors

`UiColorTransitionEcsComponent` eases the sprite's `tintColor` towards
`normalColor`, `hoverColor`, `pressedColor` or `disabledColor` as the
element's state changes. Tints multiply the sprite's texture, and a
[`Color`](/Forge/docs/api/classes/Color) channel can go above `1`, so a
button can rest at `Color.white` (its art as authored) and brighten on
hover:

```ts
const play = createButton(world, canvas, {
  // ...
  transition: {
    hoverColor: new Color(1.2, 1.2, 1.2),
    pressedColor: new Color(0.8, 0.8, 0.8),
  },
});
```

On the canvas or an 8-bit render target, each channel of the result stops
at full brightness, so a hover color above `1` only brightens art that
isn't already white there. An `easing` that overshoots (`easeInOutBack`,
`easeInOutElastic`) briefly passes the target color, including above `1`.

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
An element [hidden](../rendering/visibility.md#hiding-ui-elements) by its
own or an ancestor's `VisibilityEcsComponent` isn't a candidate, and focus
on an element that becomes hidden is cleared.

## Hit testing and drag

`createUiRaycastEcsSystem` scans interactables topmost-first (reverse
[draw order](../rendering/draw-order.md)) each tick, publishing `CanvasEcsComponent.hoveredEntity`/
`isPointerOverUi` - read the latter to gate world interaction ("don't fire
the weapon when the click landed on the pause button"). An element with
`blocksRaycasts: false` is transparent to the scan, and so is a hidden
element. A press or drag on an element that becomes hidden is cancelled:
`onEndDrag` (if it was dragging) and `onPointerUp` are raised, and
`onInvoke` isn't. A captured press that
moves beyond `dragThreshold` (measured in reference pixels) raises
`onBeginDrag`/`onDrag`/`onEndDrag` instead of `onInvoke` - useful for
building a slider handle or a scrollbar thumb.
