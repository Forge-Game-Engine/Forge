---
sidebar_position: 2.75
---

# Visibility

[`VisibilityEcsComponent`](/Forge/docs/api/interfaces/VisibilityEcsComponent)
shows or hides an entity and every entity parented under it, at any depth.
It works the same on world sprites, text, particle emitters and UI
elements.

An entity hidden in the hierarchy (its own `visible` is `false`, or an
ancestor's is):

- draws nothing: the render system skips its sprite and its text, for every
  camera;
- spawns no particles from its emitters (see
  [Hiding an emitter](#hiding-an-emitter));
- takes no space in a UI layout group or content size fitter, can't be hit
  by the pointer and can't be focused (see
  [Hiding UI elements](#hiding-ui-elements)).

Its components stay, and systems that don't draw, lay out or take input
(physics, animation, timers and game systems) still process it. To stop a group of systems, use
[run conditions and game states](../states/index.md) instead.

An entity without a `VisibilityEcsComponent` is visible unless an ancestor
is hidden.

## Hiding an entity and its children

Add the component with
[`addVisibilityComponent`](/Forge/docs/api/functions/addVisibilityComponent)
and set `visible`:

```ts
import { addVisibilityComponent } from '@forge-game-engine/forge/rendering';

world.setParent(child, parent);

const parentVisibility = addVisibilityComponent(world, parent);

// Hides the parent and its child.
parentVisibility.visible = false;

// Shows both again.
parentVisibility.visible = true;
```

A descendant can't show itself while an ancestor is hidden: its own
`visible: true` only matters once every ancestor is visible too.

`visible` is read every frame, so a change shows on the next frame. No
system writes it unless you hand the entity to one that does, like a
tooltip's panel (see
[Tooltips](../ui/canvas-groups-and-tooltips.md#adding-a-tooltip)).

## Hiding one part of an entity

Visibility hides a whole entity. To hide one part of a composite object
on its own (a toggle's checkmark, a text field's caret), give that part its own entity, parented to the object, and hide
that entity.

## Checking whether an entity is visible

[`isVisibleInHierarchy`](/Forge/docs/api/functions/isVisibleInHierarchy)
returns `false` if the entity or any of its ancestors is hidden:

```ts
import { isVisibleInHierarchy } from '@forge-game-engine/forge/rendering';

if (isVisibleInHierarchy(world, entity)) {
  // ...
}
```

It walks up the parent chain on every call; nothing stores the result.

## Hiding an emitter

A particle emitter on an entity hidden in the hierarchy spawns no
particles. Its timing still advances while it's hidden: a batch started
with `emit()` runs to its end without spawning, and a stream
(`emissionRate`) spawns nothing for the time it was hidden. Showing the
emitter again doesn't spawn what it skipped.

Particles spawned before the emitter was hidden are entities of their own,
not children of the emitter, so they keep moving and fading until their
lifetime ends.

## Hiding UI elements

A hidden UI element, and everything under it:

- is left out of its parent's layout group and content size fitter, the
  same as a child with `LayoutElementEcsComponent.ignoreLayout`, so the
  elements after it close the gap. Its own rect is still resolved, so it
  appears in the right place on the frame it's shown again.
- isn't hit by UI raycasts, so the pointer goes through it to what's
  beneath, and a hovered element raises `onPointerExit`.
- isn't a focus navigation candidate. If the focused element is hidden,
  the canvas's focus is cleared (`focusedEntity` is set to `null`). The
  next navigation input focuses the first candidate again, or your code
  can focus another element itself.
- has a press or drag in progress cancelled: it raises `onEndDrag` if it
  was dragging, then `onPointerUp`, and never `onInvoke`. A slider stops
  following the pointer.

To fade a UI subtree, or turn off its input while it's still drawn, use a
canvas group instead (see
[Hiding and fading](../ui/canvas-groups-and-tooltips.md#hiding-and-fading)).
