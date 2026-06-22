---
sidebar_position: 6
---

# Interaction and Events

Every interactive UI element goes through the same two-system pipeline:
[`createUiHitTestEcsSystem`](/Forge/docs/api/functions/createUiHitTestEcsSystem)
resolves which element the pointer is over, and
[`createUiStateEcsSystem`](/Forge/docs/api/functions/createUiStateEcsSystem)
turns that into hover/press/click transitions and the events on
[`UiStateEcsComponent`](/Forge/docs/api/interfaces/UiStateEcsComponent).
Widget factories (`createUiButton`, `createUiCheckbox`, ...) wire this up
for you; this guide is for listening to those events directly, or building
your own interactive entity from the underlying components.

```ts
import {
  createUiButton,
  createUiRenderable,
} from '@forge-game-engine/forge/ui';

const button = createUiButton(world, {
  renderable: createUiRenderable(renderContext),
  renderContext,
  font,
  rect: { x: 0, y: 0, width: 120, height: 40 },
  parent: canvasEntity,
  label: 'Save',
  onClick: (event) => {
    console.log('clicked by', event.source); // 'pointer' | 'keyboard'
  },
});

// Listening to a different event on the same widget:
button.state.onHoverEnter.registerListener((event) => {
  console.log('hover entered at', event.pointer.x, event.pointer.y);
});
```

## The event lifecycle

Each frame, `createUiHitTestEcsSystem` writes `hovered` (and `pressed`,
mirrored from the previous frame) onto the canvas's
[`UiPointerStateEcsComponent`](/Forge/docs/api/interfaces/UiPointerStateEcsComponent).
`createUiStateEcsSystem` then reads that, plus the `ui.primaryPress` hold
action, and drives these transitions on every entity with a
`UiStateEcsComponent`:

1. **Hover enter/exit**: fires when the entity becomes (or stops being) the
   `hovered` entity. Only one element can be hovered per canvas, the
   topmost by `zIndex`, or the first `blocksPointer` element encountered
   while resolving overlaps.
2. **Press start**: fires when the primary pointer button goes down while
   an element is hovered. That element becomes the "pressed" entity for the
   duration of the hold, even if the pointer subsequently moves off it.
3. **Press end**: fires on button-up, for whichever element received the
   press-start, regardless of whether the pointer is still over it.
4. **Click**: fires immediately after press-end, but only if the pointer is
   *still over the same element* that received the press-start. Press-start
   on a button, drag off, and release is a press-end with no click, the
   standard "drag to cancel" gesture.
5. **Disabled short-circuit**: if `state.disabled` is `true`, none of the
   above run and no events fire, the element is functionally invisible to
   the hit-test/state pipeline (though `createUiHitTestEcsSystem` still
   skips it earlier too, via `UiInteractableEcsComponent.enabled`).

Keyboard activation (`Enter`/`Space` on a focused element) synthesizes the
same `onPressStart` → `onPressEnd` → `onClick` sequence with
`source: 'keyboard'`, so a listener that doesn't branch on `source` handles
both input modes for free. See [Focus and Keyboard Navigation](./focus-and-keyboard-navigation.md).

## `onClick` is a Forge event, not a DOM event

`UiStateEcsComponent.onClick` (and every other event on it) is a
[`ParameterizedForgeEvent`](/Forge/docs/api/classes/ParameterizedForgeEvent)
carrying a [`UiInteractionEvent`](/Forge/docs/api/interfaces/UiInteractionEvent)
payload (`entity`, `pointer`, `source`), not a browser `PointerEvent` or
`MouseEvent`. There's no `event.target`, `event.preventDefault()`, or
bubbling; every listener registered on a given event fires for every raise,
in registration order. `createUiButton`'s `onClick` option is sugar for
`state.onClick.registerListener(onClick)`, registered alongside the
widget's own internal listeners (which apply per-state styling), so
multiple listeners on the same event coexist without one having to call
through to the other.

```ts
import { ParameterizedForgeEvent } from '@forge-game-engine/forge/events';

// Equivalent to the onClick option above:
button.state.onClick.registerListener((event) => {
  console.log('clicked by', event.source);
});
```

## Per-state style

`UiStateStyleConfig` (the `stateStyles` option accepted by every
interactive widget factory) maps `hover` / `pressed` / `focused` /
`disabled` to a partial set of visual overrides (`tintColor`,
`borderColor`, `borderWidth`, `cornerRadius`, `opacity`).
[`applyUiStateStyle`](/Forge/docs/api/functions/applyUiStateStyle) applies
them on top of the widget's base style in a fixed priority order: base →
`hover` → `focused` → `pressed` → `disabled`, so a pressed-and-focused
button always ends up with the pressed look winning over the focus ring
colour, regardless of which state changed last.

```ts
import { Color } from '@forge-game-engine/forge/rendering';

createUiButton(world, {
  // ...
  tintColor: Color.white,
  stateStyles: {
    hover: { tintColor: Color.fromHSLA(210, 80, 90, 1) },
    pressed: { tintColor: Color.fromHSLA(210, 80, 75, 1) },
    focused: { borderColor: Color.fromHSLA(210, 90, 50, 1), borderWidth: 2 },
    disabled: { opacity: 0.4 },
  },
});
```

Each widget factory calls `applyUiStateStyle` from listeners on every state
event (`onHoverEnter`, `onPressStart`, `onFocus`, `onDisabledChange`, ...),
always resetting to the base style first, so you never need to manually
restore a previous look when a state ends, omit a key from `stateStyles`
and that state simply renders as the base style.

## Gotchas

- **`createUiCanvas` does not attach `UiPointerStateEcsComponent`.** Without
  it, `createUiHitTestEcsSystem` finds no canvas to write `hovered`/`pressed`
  into, and every element silently never hovers or clicks. Add it manually,
  as shown in the [Quick Start](./index.md#quick-start). This is the single
  most common reason a button renders but doesn't respond.
- **`blocksPointer` stops hit-testing, it doesn't stop hover.** An element
  with `blocksPointer: true` (the default for enabled interactive widgets)
  becomes the hovered element and prevents anything behind it from being
  considered, even if it itself isn't interactive. Set `blocksPointer: false`
  on purely decorative overlays so clicks pass through to what's behind them.
- **Press state survives the pointer leaving the element.** `pressed`
  stays attached to the entity that received press-start until button-up,
  by design, this is what makes "drag off to cancel" possible. Don't expect
  `onPressEnd` to imply the pointer is still over the element; check
  `state.hovered` (or rely on `onClick`, which already encodes that check)
  if you need "released while still hovering."
- **Listeners aren't automatically cleared when an entity is destroyed.**
  Removing the entity directly leaves `ParameterizedForgeEvent` listener
  arrays referencing closures that can no longer do anything useful, a
  minor leak rather than a crash, but avoidable. Use the widget's
  `destroy()` (from its `UiWidgetHandle`), which calls `.clear()` on every
  event it owns before removing entities.

## Common mistake

Wiring interactivity without `UiInteractableEcsComponent` means the
hit-test system never considers the entity at all, regardless of how many
listeners are attached to its `UiStateEcsComponent`:

```ts
// Wrong: has UiStateEcsComponent but no UiInteractableEcsComponent, so
// the hit-test system skips it and hover/press/click never fire.
const entity = world.createEntity();
world.addComponent(entity, uiTransformId, { ...transform });
world.addComponent(entity, uiStateId, createUiState());

// Right: also mark it as a hit-test participant.
world.addComponent(entity, uiInteractableId, { enabled: true, blocksPointer: true });
```

In practice, reach for a widget factory (`createUiButton`, `createUiPanel`
with manual state wiring, etc.) rather than assembling the component set by
hand; they already attach `UiInteractableEcsComponent` correctly.

See [Focus and Keyboard Navigation](./focus-and-keyboard-navigation.md) for
how `onFocus`/`onBlur` fit into this same event model, and
[Defocus and Blur Behaviour](./defocus-and-blur.md) for what happens to
hover/press/focus when the browser context changes underneath the canvas.
