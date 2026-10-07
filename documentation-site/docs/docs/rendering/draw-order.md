---
sidebar_position: 2.5
---

# Draw Order

When sprites and text overlap, the one drawn last is on top. A camera
draws everything it sees in one order, decided by four things, each one
only breaking ties left by the one before:

1. **Layer**: the sprite's or text's own `layer`. A lower layer draws
   first.
2. **World order**: the entity's
   [`DrawOrderEcsComponent`](/Forge/docs/api/interfaces/DrawOrderEcsComponent)
   `order`, added to its parent's world order. A lower world order draws
   first.
3. **Y**, only for a camera with `ySort`: a higher root Y draws first.
4. **Hierarchy order**: root entities in the order they were created,
   each followed by its children, parents before children and siblings in
   the order they were parented.

Hierarchy order is unique for every entity, so the order never depends on
how entities happen to be stored, and it doesn't change from frame to frame
unless you change one of these four things. An entity's sprite draws
before its text.

Draw order is per camera. Which camera's output ends up on top of another
is decided by the cameras' own `layer` (see
[Multipass Rendering](./multipass-rendering.md)).

## Drawing in hierarchy order

Without a `DrawOrderEcsComponent`, everything in a layer draws in hierarchy
order. Create backgrounds before what moves over them, and parent things
that belong together, and they draw in the right order:

```ts
const background = world.createEntity(); // drawn first
const ship = world.createEntity();
const cockpit = world.createEntity();

world.setParent(cockpit, ship); // drawn right after the ship, on top of it
```

A root entity keeps its place by creation even when entities created
before it are removed. An entity unparented with `removeParent` goes back
to its own creation among the roots.

## Putting things on a layer

Things that must stay behind or in front of everything else, whatever was
created when, go on their own layer. Give them a lower or higher `layer`:

```ts
const sky = addSpriteComponent(world, skyEntity, { ...skySprite, layer: -1 });
const hud = addTextComponent(world, hudEntity, { ...hudText, layer: 1 });
```

A layer is a number on the sprite or text, so it isn't inherited by
children.

## Ordering relative to the parent

Add a `DrawOrderEcsComponent` to move an entity, and everything parented
under it, forwards or backwards within its layer:

```ts
world.setParent(flame, ship);
addDrawOrderComponent(world, flame, { order: -1 });
```

The `order` is an integer from `-4096` to `4096`, and it's relative: an
entity's world order is its own `order` plus its parent's world order. A
flame at `-1` draws behind every entity at its ship's level, not only
behind its own ship, and keeps doing so wherever the ship moves, with no
code that runs every frame. An order on an entity without a sprite moves
its whole subtree, so a container can raise a group of sprites at once.

## Sorting by height on screen

Top-down and isometric games draw whatever is lower on the screen in front.
Set `ySort` on their camera:

```ts
const camera = createCamera(world, { ySort: true });
```

The camera then sorts by Y after layer and world order: a higher Y draws
first. Each root entity's subtree sorts by the root's Y, so a character's
sword stays with the character rather than sorting by its own Y. A game
that parents its whole scene under one root therefore gets no Y-sorting.
A root without a position sorts as Y `0`.

## Draw order and UI input

UI elements are entities too, so a UI canvas draws in hierarchy order:
a panel's label, a child of the panel, draws on top of the panel. UI
raycasts hit, and navigation that starts with nothing focused picks, by
the same order: an element raised with a `DrawOrderEcsComponent` both
draws above its later siblings and takes clicks before them. An element
without a sprite or text (an invisible hit region) counts as layer `0`.
