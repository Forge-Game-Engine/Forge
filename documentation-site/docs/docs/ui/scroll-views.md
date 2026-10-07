---
sidebar_position: 10
---

# Scroll Views

A scroll view shows part of a larger piece of content through a viewport
and moves the content when the player drags it, turns the mouse wheel,
drags a scrollbar or moves focus to a control inside it. Content outside
the viewport isn't drawn and can't be clicked.

## Scroll view parts

A scroll view is made of these entities:

- The **viewport**: the scroll view's root entity. It has a
  [`UiScrollRectEcsComponent`](/Forge/docs/api/interfaces/UiScrollRectEcsComponent),
  a rect [`MaskEcsComponent`](../rendering/masks.md) that clips the content
  to its rect, and a
  [`UiInteractableEcsComponent`](/Forge/docs/api/interfaces/UiInteractableEcsComponent)
  with `receivesDrag: true` and `focusable: false`.
- The **content**: a direct child of the viewport that holds the items. Its
  `RectTransformEcsComponent` is anchored and pivoted at its top-left
  corner, and usually has a [layout group](./layout-groups.md) and a
  `ContentSizeFitterEcsComponent`, so it grows to fit its items.
- Optional **scrollbars**: a track (a child of the viewport with its own
  `UiInteractableEcsComponent`) and a handle (a child of the track).

`createUiScrollRectEcsSystem`, registered by `registerUiSystems` when a
`pointerSource` is given, moves the content every tick.

## Creating a scroll view

[`createScrollView`](/Forge/docs/api/functions/createScrollView) creates a
viewport with a vertical list as its content. Parent the list's items to
`content`:

```ts
import {
  createButton,
  createScrollView,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

const levels = createScrollView(world, canvas, {
  anchor: UiAnchor.center({ x: 560, y: 720 }),
  sprite: backgroundSprite,
  layout: { spacing: 12 },
  scrollbarSprite: trackSprite,
  scrollbarHandleSprite: handleSprite,
});

for (const name of levelNames) {
  createButton(world, levels.content, {
    sprite: buttonSprite,
    label: name,
    fontAtlas,
    anchor: UiAnchor.center({ x: 400, y: 72 }),
  });
}
```

The content stacks the items top to bottom, stretches them to its width
and sets its own height to fit them. The scrollbar is created when both
`scrollbarSprite` and `scrollbarHandleSprite` are given; it sits along the
viewport's right edge and the content is narrowed by its width.

For another layout, such as a horizontal strip, a grid or a map larger than
the viewport in both directions, add the components to your own entities
with
[`addUiScrollRectComponent`](/Forge/docs/api/functions/addUiScrollRectComponent):

```ts
import { addMaskComponent } from '@forge-game-engine/forge/rendering';
import {
  addRectTransformComponent,
  addUiInteractableComponent,
  addUiScrollRectComponent,
  UiAnchor,
} from '@forge-game-engine/forge/ui';

addMaskComponent(world, viewport, { width: 0, height: 0 });
addUiInteractableComponent(world, viewport, {
  receivesDrag: true,
  focusable: false,
});

addRectTransformComponent(world, map, UiAnchor.topLeft({ x: 4000, y: 3000 }));
world.setParent(map, viewport);

addUiScrollRectComponent(world, viewport, { content: map });
```

The layout sizes the mask to the viewport's rect. The system throws if the
content isn't a direct child of the viewport or isn't anchored and pivoted
at its top-left corner.

## Scrolling

The content scrolls on an axis when that axis is enabled (`horizontal` and
`vertical`, both `true` by default; `createScrollView` sets `horizontal`
to `false`) and the content is larger than the viewport on it. The player
scrolls it by:

- **Dragging.** Pressing anywhere on the viewport, including on a button in
  the content, and moving the pointer past the pressed element's
  `dragThreshold` drags the content with the pointer. A button that is
  dragged this way isn't invoked. Sliders keep their own drags (see
  [Hit testing and drag](./buttons-and-interaction.md#hit-testing-and-drag)).
- **Turning the mouse wheel** while the pointer is over the viewport. The
  content moves as many screen pixels as the wheel reports, and stops at
  its edges. When the content only scrolls horizontally, the vertical wheel
  scrolls it horizontally. With one scroll view inside another, the inner
  one scrolls.
- **Dragging a scrollbar's handle**, or pressing the track elsewhere, which
  moves the handle's center to the pointer. The handle's length is the
  visible fraction of the content.
- **Moving focus** with `navigateInput` to a control inside the content.
  The content scrolls just far enough to show the focused control. Focus
  that moves because the pointer hovers a control doesn't scroll.

The content's position is written one tick after the input, the same
one-frame delay a slider has.

## Inertia and elasticity

After a drag is released, the content keeps moving at the drag's speed and
slows down. `decelerationRate` is the fraction of its speed it keeps after
one second (`0.135` by default); `0` stops it when the drag ends.

`movementType` sets what happens at the content's edges:

- `'elastic'` (the default): a drag pulls the content past an edge, moving
  it less the further it goes, and the content springs back when the drag
  is released, taking about `elasticity` seconds (`0.1` by default).
- `'clamped'`: the content stops at its edges.

```ts
const log = createScrollView(world, canvas, {
  scrollRect: { movementType: 'clamped', decelerationRate: 0 },
});
```

## Reading and setting the scroll position

`UiScrollRectEcsComponent.offset` is how far the content has moved from its
rest position, in reference pixels, Y-up. At `(0, 0)` the content's top-left
corner is at the viewport's top-left corner. Scrolling down moves the
content up, so `offset.y` grows from `0` to the content's height minus the
viewport's height. Scrolling right moves it left, so `offset.x` falls from
`0`. The system writes it while the player scrolls, and game code can write
it to scroll:

```ts
levels.scrollRect.offset.y = 0; // back to the top
```

`onValueChanged` is raised with the new offset whenever it changes:

```ts
levels.scrollRect.onValueChanged.registerListener((offset) => {
  showMoreIndicator.visible = offset.y < maxOffsetY;
});
```

[`computeUiScrollRange`](/Forge/docs/api/functions/computeUiScrollRange)
returns how far the content can scroll on each axis, and
[`normalizeUiScrollOffset`](/Forge/docs/api/functions/normalizeUiScrollOffset)
and
[`denormalizeUiScrollOffset`](/Forge/docs/api/functions/denormalizeUiScrollOffset)
convert between an offset and a `0` to `1` position (`y` is `1` at the top
and `0` at the bottom):

```ts
import {
  computeUiScrollRange,
  denormalizeUiScrollOffset,
  rectTransformId,
} from '@forge-game-engine/forge/ui';

const range = computeUiScrollRange(
  world.getComponent(levels.entity, rectTransformId)!.rect,
  world.getComponent(levels.content, rectTransformId)!.rect,
);

levels.scrollRect.offset = denormalizeUiScrollOffset({ x: 0, y: 0 }, range); // the bottom
```

:::note
The system owns the content's `anchoredPosition` and writes `offset` into
it every tick. Move the content by writing `offset`, and don't put the
content under a layout group or a safe area, which also write
`anchoredPosition`.
:::
