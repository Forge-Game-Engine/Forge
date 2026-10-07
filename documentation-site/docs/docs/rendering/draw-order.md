---
sidebar_position: 2.5
---

# Draw Order

Where sprites and text overlap, the one drawn last is on top. A camera
draws its sprites and text in one order, sorted by four keys. Each key
only orders items the keys before it leave equal:

1. **Layer**: the sprite's or text's own `layer`. A lower layer draws
   first.
2. **World order**: the entity's
   [`DrawOrderEcsComponent`](/Forge/docs/api/interfaces/DrawOrderEcsComponent)
   `order`, added to its parent's world order. A lower world order draws
   first.
3. **Y**, only for a camera with `ySort`: a higher root Y draws first.
4. **Hierarchy order**: root entities in the order they were created,
   each followed by its children, parents before children and siblings in
   the order they were parented. A child with `behindParent` comes just
   before its parent instead (see
   [Drawing a child just behind its parent](#drawing-a-child-just-behind-its-parent)).

Every entity has its own place in hierarchy order, so the order is the same
every frame until one of these four keys changes. An entity's sprite draws
before its text.

Draw order applies within one camera. Which camera's output is drawn over
another's is set by the cameras' own `layer` (see
[Layering multiple render targets](./multipass-rendering.md#layering-multiple-render-targets)).
UI hit testing checks elements in the reverse of this order, without
Y-sorting (see
[Buttons and Interaction](../ui/buttons-and-interaction.md#hit-testing)).

## Drawing in hierarchy order

Without a `DrawOrderEcsComponent`, everything in a layer draws in hierarchy
order. A root entity created later draws on top of one created earlier, and
a child draws on top of its parent:

```ts
const background = world.createEntity(); // drawn first
const body = world.createEntity(); // drawn on top of background
const detail = world.createEntity();

world.setParent(detail, body); // drawn right after body, on top of it
```

A root entity keeps its place in creation order when entities created
before it are removed. An entity unparented with `removeParent` returns to
its own place in creation order among the roots.

## Putting sprites and text on a layer

Sprites and text that stay behind or in front of everything else,
whatever order their entities were created in, go on their own layer. Give
them a lower or higher `layer`:

```ts
addSpriteComponent(world, backgroundEntity, {
  ...backgroundSprite,
  layer: -1,
});
addTextComponent(world, labelEntity, { ...labelText, layer: 1 });
```

A layer is a field of the sprite or text component, so children don't
inherit it.

## Ordering relative to the parent

Add a [`DrawOrderEcsComponent`](/Forge/docs/api/interfaces/DrawOrderEcsComponent)
with [`addDrawOrderComponent`](/Forge/docs/api/functions/addDrawOrderComponent)
to move an entity, and every entity parented under it, forwards or
backwards within its layer:

```ts
import { addDrawOrderComponent } from '@forge-game-engine/forge/rendering';

world.setParent(background, panel);
addDrawOrderComponent(world, background, { order: -1 });
```

`order` is an integer from `-4096` to `4096`, and it's relative: an
entity's world order is its own `order` plus its parent's world order. The
child at `-1` draws behind every entity at its parent's world order, not
only behind its own parent. An order on an entity without a sprite or text
moves its whole subtree.

## Drawing a child just behind its parent

A child draws on top of its parent. To draw it behind its parent but in
front of everything its parent is in front of, such as an engine flame
behind its ship or a glow behind the orb it surrounds, set `behindParent`:

```ts
world.setParent(flame, ship);
addDrawOrderComponent(world, flame, { behindParent: true });
```

In hierarchy order, the child and its own children come just before their
parent instead of after it, so the parent's subtree still draws as one
block. Siblings that all set `behindParent` keep their sibling order among
themselves. `behindParent` does nothing on a root entity.

## Sorting by height on screen

For a top-down or isometric view, set `ySort` on the camera, so whatever
is lower on screen is drawn in front:

```ts
const camera = createCamera(world, { ySort: true });
```

The camera then sorts by Y after layer and world order: a higher Y draws
first. Every entity sorts by the Y of its root entity (its topmost
ancestor), so an entity's children sort with it rather than by their own Y.
Entities under one shared root all sort by that root's Y, so they aren't
Y-sorted against each other. A root without a position sorts as Y `0`.
