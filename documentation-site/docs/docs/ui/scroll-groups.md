---
sidebar_position: 14
---

# Scroll Groups

[`createUiScrollGroup`](/Forge/docs/api/functions/createUiScrollGroup) builds a
clipped viewport with a scrollable content child: a list of inventory items,
a chat log, a settings panel with more rows than fit on screen. It's the
container widget you reach for whenever content is taller (or wider) than the
space you want it to occupy.

```ts
import { createUiScrollGroup, createUiPanel } from '@forge-game-engine/forge/ui';
import { Vector2 } from '@forge-game-engine/forge/math';

const viewportRenderable = createUiRenderable(renderContext);
const contentRenderable = createUiRenderable(renderContext);

const itemHeight = 28;
const itemCount = 100;

const scrollGroup = createUiScrollGroup(world, {
  renderable: viewportRenderable,
  contentRenderable,
  rect: { x: 0, y: 0, width: 280, height: 240 },
  parent: canvasEntity,
  contentSize: new Vector2(280, itemCount * itemHeight),
});

for (let i = 0; i < itemCount; i++) {
  createUiPanel(world, {
    renderable: itemRenderable,
    rect: { x: 4, y: i * itemHeight, width: 272, height: itemHeight - 2 },
    parent: scrollGroup.contentEntity,
  });
}
```

## Viewport vs content entity

A scroll group is two entities, not one. `scrollGroup.entity` is the
**viewport**: a clipped panel with a fixed rect that never moves.
`scrollGroup.contentEntity` is the **content** container, a stretched child
whose vertical (or horizontal) offset is driven every frame by
`UiScrollEcsComponent.scroll`. Parent every scrollable child to
`contentEntity`, never to the viewport entity directly, or your rows won't
move when the user scrolls.

The viewport carries [`UiClipEcsComponent`](./clipping-and-masking.md), the
same primitive `createUiClip` uses, so content outside the viewport's rect is
masked the same way it would be for any other clipped container. See
[Clipping and Masking](./clipping-and-masking.md) for how that propagates to
deeper descendants.

## Enabling scroll behaviour

`createUiScrollGroup` only creates entities; it doesn't move anything on its
own. Add [`createUiScrollEcsSystem`](/Forge/docs/api/functions/createUiScrollEcsSystem)
to the world, after the layout system, to get:

- **Mouse wheel scrolling**, driven by the `ui.scrollY` axis action
  (`uiInputActionNames.scrollY`). The pointer has to be hovering the viewport
  entity for wheel input to apply, the same hover state the hit-test system
  already tracks, so no extra wiring is needed beyond registering the action.
- **Scrollbar thumb drag**, if a scrollbar was created (see below).
- **Ensure-visible**, scrolling automatically to keep the keyboard-focused
  descendant in view, useful when a user tabs through a long scrollable form.

```ts
import { createUiScrollEcsSystem } from '@forge-game-engine/forge/ui';

world.addSystem(createUiScrollEcsSystem(inputManager));
```

## Optional scrollbar

Pass `showScrollbar: true` and a `scrollbarRenderable` to get a thin track
and thumb along the viewport's trailing edge (right for vertical, bottom for
horizontal):

```ts
const scrollGroup = createUiScrollGroup(world, {
  renderable: viewportRenderable,
  contentRenderable,
  scrollbarRenderable: createUiRenderable(renderContext),
  rect: { x: 0, y: 0, width: 280, height: 240 },
  parent: canvasEntity,
  contentSize: new Vector2(280, itemCount * itemHeight),
  showScrollbar: true,
});
```

Without `scrollbarRenderable`, `showScrollbar: true` is silently ignored, no
scrollbar entities are created, since the factory has nothing to render them
with. The thumb's size and position are recalculated every frame from
`contentSize` and the viewport's resolved size, so resizing the canvas or
changing `contentSize` at runtime keeps the thumb proportions correct without
any extra code on your part.

## Gotchas

- **`viewportSize` is never set automatically, by the factory or the
  system.** `createUiScrollGroup` initialises it to `(0, 0)` and nothing
  else writes to it, the scroll system only reads it to clamp the maximum
  scroll offset. Set `scrollGroup.scroll.viewportSize` yourself right after
  creation (matching the same width/height you passed as the viewport
  `rect`), otherwise the "scroll offset is clamped" behaviour described
  below has no effective upper bound and the content can be scrolled
  arbitrarily far past its end.
- **`contentSize` is set once by the factory and not auto-updated.** If you
  add or remove rows after creation (an infinite list, a filtered search
  result), update `scrollGroup.scroll.contentSize` yourself. The scroll
  system reads it fresh every frame, so there's no separate "refresh" call
  needed, just mutate the `Vector2` in place or assign a new one.
- **Orientation determines which axes respond to scrolling**, default
  `'vertical'`. Setting `orientation: 'horizontal'` or `'both'` changes which
  offset fields the scroll system writes, but it's still your job to lay
  child rows out along the matching axis; the scroll group doesn't auto-wrap
  content into a grid or row flow.
- **Scroll offset is clamped, not wrapped.** `scroll.y` (or `.x`) can never
  go negative or exceed `contentSize - viewportSize`; there's no rubber-band
  overscroll effect past the edges. If `contentSize` is smaller than the
  viewport, scroll stays pinned at `0` and the optional scrollbar thumb fills
  the entire track.
- **Wheel input only scrolls the hovered scroll group.** Nested scroll
  groups (a scrollable sidebar inside a scrollable page) don't both react to
  one wheel event, only whichever one the pointer is directly over at hit-test
  time receives it.

## Performance

Off-screen rows are culled before they're packed into the render system's
instance buffer, the same clip-based culling every clipped container gets,
not something scroll groups add specially. A list of a thousand rows backed
by one shared `contentRenderable` only pays the per-instance cost for the
handful of rows actually within (or partially within) the viewport's clip
rect each frame, regardless of how far the user has scrolled. See
[UI Performance](./ui-performance.md) for the full picture of how this
interacts with batching and `zIndex`.

This makes a scroll group the right tool for "long list" UI even at a few
hundred items: don't hand-roll virtualization (creating/destroying row
entities as they scroll in and out of view) unless you've measured that
per-instance packing cost is actually your bottleneck, the render system is
already doing the equivalent culling for you for free.
