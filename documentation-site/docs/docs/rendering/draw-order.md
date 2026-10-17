---
sidebar_position: 2.5
---

# Draw Order

Where sprites, text and [meshes](./meshes.md) overlap, the one drawn last
is on top. A camera draws its sprites, text and meshes in one order, sorted
by four keys. Each key only orders items the keys before it leave equal:

1. **Layer**: the sprite's, text's or mesh's own `layer`. A lower layer
   draws first.
2. **World order**: the entity's
   [`DrawOrderEcsComponent`](/Forge/docs/api/interfaces/DrawOrderEcsComponent)
   `order`, added to its parent's world order. A lower world order draws
   first.
3. **Y**, only for a camera with `ySort`: a lower sort unit Y draws first
   (see [Sorting by height on screen](#sorting-by-height-on-screen)).
4. **Hierarchy order**: root entities in the order they were created,
   each followed by its children, parents before children and siblings in
   the order they were parented. A child with `behindParent` comes just
   before its parent instead (see
   [Drawing a child just behind its parent](#drawing-a-child-just-behind-its-parent)).

Every entity has its own place in hierarchy order, so the order is the same
every frame until one of these four keys changes. An entity's mesh draws
before its sprite, and its sprite before its text. A
[trail](./trails.md#draw-order) is drawn by its entity's mesh.

Draw order applies within one camera. Which camera's output is drawn over
another's is set by the cameras' own `layer` (see
[Layering multiple render targets](./multipass-rendering.md#layering-multiple-render-targets)).
UI hit testing checks elements in the reverse of the order their canvas's
camera draws them in (see
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

## Putting sprites, text and meshes on a layer

Sprites, text and meshes that stay behind or in front of everything else,
whatever order their entities were created in, go on their own layer. Give
them a lower or higher `layer`:

```ts
addSpriteComponent(world, backgroundEntity, {
  ...backgroundSprite,
  layer: -1,
});
addTextComponent(world, labelEntity, { ...labelText, layer: 1 });
addMeshComponent(world, groundEntity, { ...groundMesh, layer: -1 });
```

A layer is a field of the sprite, text or mesh component, so children
don't inherit it.

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
only behind its own parent. An order on an entity without a sprite, text or
mesh moves its whole subtree.

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

The camera then sorts by Y after layer and world order: a lower Y (higher
on screen) draws first. It sorts **sort units**, not single entities. Every
root entity is a sort unit, and its whole subtree sorts by the root's
`position.world.y`, so a character's children (a sword, a shadow) draw with
the character rather than by their own Y. A unit without a position sorts
as Y `0`.

Sort units at the same Y draw in hierarchy order: roots in the order they
were created, units under one root in sibling order. The entities of one
unit draw together, in hierarchy order.

### Y-sorting an entity's children

Entities parented under one root sort by that root's Y, so they aren't
Y-sorted against each other or against other roots. To sort each child of
an entity by its own Y, such as the walls under a level entity, set
`ySortChildren` on the entity's
[`DrawOrderEcsComponent`](/Forge/docs/api/interfaces/DrawOrderEcsComponent):

```ts
import { addDrawOrderComponent } from '@forge-game-engine/forge/rendering';

addDrawOrderComponent(world, level, { ySortChildren: true });
world.setParent(wall, level);
world.setParent(tree, level);
```

Each child of a sort unit with `ySortChildren` is a sort unit of its own,
so `wall` and `tree` each sort against every root, such as a character, by
their own Y. The level entity is a unit containing only itself. Every
other entity belongs to the unit of its nearest ancestor that is one, so a
wall's own children draw with the wall.

`ySortChildren` only applies on an entity that is a sort unit itself. For
the rows under a layer entity under a level root to sort against a
character, both the level and the layer set `ySortChildren`:

```ts
addDrawOrderComponent(world, level, { ySortChildren: true });
addDrawOrderComponent(world, layer, { ySortChildren: true });
world.setParent(layer, level);
world.setParent(row, layer);
```

World order still comes before Y, so a floor child with an `order` of `-1`
draws behind every entity at world order `0`, whatever its Y. A
`behindParent` child that is a sort unit sorts against its parent by Y, and
`behindParent` only orders them when their Y is equal. Cameras without
`ySort` ignore `ySortChildren`.

### Choosing where an entity sorts

A sort unit sorts at its entity's position. To sort it at another point,
such as the base of a tree whose sprite is centred on its position, set
`ySortOrigin`:

```ts
addDrawOrderComponent(world, tree, { ySortOrigin: 2 });
```

The unit sorts by the world Y of the point `(0, ySortOrigin)` in its
entity's local space, so the point turns and scales with the entity's
`rotation.world` and `scale.world`. A positive value moves it down the
screen. `ySortOrigin` has no effect on an entity that isn't a sort unit.
