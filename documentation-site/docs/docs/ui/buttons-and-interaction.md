---
sidebar_position: 5
---

# Buttons and Interaction

A [`UiInteractableEcsComponent`](/Forge/docs/api/interfaces/UiInteractableEcsComponent)
makes a UI element respond to the pointer and to focus navigation with a
gamepad or keyboard. A button is a panel with an interactable, a color
transition and a centered label.

## Creating a button

[`createButton`](/Forge/docs/api/functions/createButton) creates a button
under a parent element:

```ts
import { createButton } from '@forge-game-engine/forge/ui';

const playButton = createButton(world, canvas, {
  sprite: buttonSprite,
  label: 'Play',
  fontAtlas,
  labelSize: 32,
  labelCategory: uiRenderCategory,
});
```

It returns the button's `entity`, its `label` entity, its `interactable`
component and its `onInvoke` event.

:::caution
The label is centered within the width of the button's `anchor.x` size.
With a stretch `x` axis, that value is a margin, not a width, so pass the
button's width as `labelMaxWidth`.
:::

## Reacting to a button press

An interactable's `onInvoke` is raised when the element is invoked: the
pointer is pressed and released on it without dragging, or the canvas's
`submitInput` triggers while the element has focus. It's the same event
either way:

```ts
playButton.onInvoke.registerListener(() => {
  startGame();
});
```

To poll instead of listening, read the interactable's
`wasInvokedThisFrame`, which is `true` for the tick `onInvoke` was raised.

## Making any element interactable

[`addUiInteractableComponent`](/Forge/docs/api/functions/addUiInteractableComponent)
makes any element with a rect transform interactable, for example a list
row or a close icon:

```ts
import { addUiInteractableComponent } from '@forge-game-engine/forge/ui';

const closeIcon = addUiInteractableComponent(world, closeIconEntity);

closeIcon.onInvoke.registerListener(closeWindow);
```

The element is hit-tested against its rectangle. Besides `onInvoke`, an
interactable raises `onPointerEnter`, `onPointerExit`, `onPointerDown`,
`onPointerUp`, and the [drag](#dragging) events.

## Reading interaction state

The UI systems write an interactable's state every tick:

- `isHovered`: the pointer is over the element.
- `isFocused`: the element is its canvas's focused element (see
  [Focus navigation](#focus-navigation)).
- `isPressed`: a press started on the element and the pointer is still
  over it.
- `isDragging`: a press on the element has become a drag.

[`deriveUiInteractionVisualState`](/Forge/docs/api/functions/deriveUiInteractionVisualState)
combines them into one of `'normal'`, `'hover'` (hovered or focused),
`'pressed'` or `'disabled'`, so an element looks the same when the mouse
is over it as when a gamepad has focused it.

## Hover and press colors

A [`UiColorTransitionEcsComponent`](/Forge/docs/api/interfaces/UiColorTransitionEcsComponent)
eases the element's sprite `tintColor` to `normalColor`, `hoverColor`,
`pressedColor` or `disabledColor` when its visual state changes.
`createButton` adds one, configured by its `transition` option;
`addUiColorTransitionComponent` adds one to any interactable element with a
sprite:

```ts
import { Color } from '@forge-game-engine/forge/rendering';

const playButton = createButton(world, canvas, {
  // ...
  transition: {
    hoverColor: new Color(1.2, 1.2, 1.2),
    pressedColor: new Color(0.8, 0.8, 0.8),
  },
});
```

Every color defaults to `Color.white`, which draws the sprite as authored.
A tint multiplies the sprite's texture, so a channel above `1` brightens
it, up to full brightness.

## Disabling an element

Set the interactable's `interactable` to `false` to disable it: it can't
be pressed, invoked or focused, and its visual state is `'disabled'`. It
still blocks the pointer from the elements under it. Set `blocksRaycasts`
to `false` to make the pointer pass through an element. To disable a panel
and everything in it at once, use a
[canvas group](canvas-groups-and-tooltips.md).

```ts
playButton.interactable.interactable = false;
```

## Focus navigation

Each canvas has at most one focused element, its
`CanvasEcsComponent.focusedEntity`. Give the canvas input actions to move
focus and invoke the focused element:

```ts
const canvas = createUiCanvas(world, renderContext, {
  cullingMask: uiRenderCategory,
  submitInput: inputManager.getTriggerAction('ui-submit'),
  cancelInput: inputManager.getTriggerAction('ui-cancel'),
  navigateInput: inputManager.getAxis2dAction('ui-navigate'),
});
```

- `navigateInput`: when its value first reaches a magnitude of `0.5`, focus
  moves in its main direction to the nearest interactable element on the
  canvas. Holding it moves focus once. With nothing focused, it focuses the
  interactable element drawn first.
- `submitInput`: invokes the focused element.
- `cancelInput`: clears focus. Register a listener on
  `cancelInput.triggerEvent` to close a menu.

An element [hidden](../rendering/visibility.md#hiding-ui-elements) by its
own or an ancestor's `VisibilityEcsComponent` can't be focused, and focus
on an element that becomes hidden is cleared. The pointer moving onto an
interactable element also focuses it. See
[Actions and Input Groups](../input/actions.md) for creating and binding
the actions.

To choose the element focus moves to in a direction, add a
[`UiFocusEcsComponent`](/Forge/docs/api/interfaces/UiFocusEcsComponent) to
the element focus moves from. Directions it doesn't set use the nearest
element:

```ts
import { addUiFocusComponent } from '@forge-game-engine/forge/ui';

addUiFocusComponent(world, lastButton.entity, { down: firstButton.entity });
```

To focus an element from code, for example the first button when a menu
opens, call [`setUiFocus`](/Forge/docs/api/functions/setUiFocus) with the
canvas's component:

```ts
import { canvasId, setUiFocus } from '@forge-game-engine/forge/ui';

setUiFocus(
  world,
  world.getComponentRequired(canvas, canvasId),
  playButton.entity,
);
```

## Hit testing

Every tick, the UI finds the interactable element under the pointer on
each canvas: of the interactables whose rectangle contains the pointer, the
one drawn on top (see [Draw Order](../rendering/draw-order.md)). Elements
with `blocksRaycasts` set to `false`, hidden elements, and elements whose
sprite the canvas's camera doesn't draw, are skipped. The result is written to the
canvas's `hoveredEntity`, and `isPointerOverUi` is `true` while there is
one. Read it to ignore a click in the game world that landed on the UI:

```ts
const canvasComponent = world.getComponentRequired(canvas, canvasId);

if (selectAction.isTriggered && !canvasComponent.isPointerOverUi) {
  // ...
}
```

:::note
Only interactable elements are hit-tested. A panel without a
`UiInteractableEcsComponent` doesn't stop the pointer from reaching an
interactable element under it.
:::

## Dragging

A press that moves `dragThreshold` reference pixels or more from where it
started becomes a drag. `onBeginDrag` is raised when it starts,
`onDrag` every tick while it lasts and `onEndDrag` when the pointer is
released. A drag doesn't raise `onInvoke`. A press or drag on an element
that becomes hidden is cancelled: `onEndDrag` (if it was dragging) and
`onPointerUp` are raised, and `onInvoke` isn't. Read the pointer's position from
the pointer source.

```ts
const handle = addUiInteractableComponent(world, handleEntity);

handle.onDrag.registerListener(() => {
  // Move the element to follow the pointer.
});
```
