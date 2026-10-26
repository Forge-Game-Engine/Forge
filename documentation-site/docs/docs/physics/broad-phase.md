---
sidebar_position: 1.6
---

# Broad Phase

The broad phase finds the pairs of colliders whose bounds overlap, so the
narrow phase only tests the shapes of colliders that can be touching. It
keeps every collider in two [dynamic AABB trees](./dynamic-aabb-tree.md)
and the pairs it found from one fixed step to the next, so each step it
only looks for new pairs around the colliders that moved.

## Creating the broad phase

[`createBroadPhase(world)`](/Forge/docs/api/functions/createBroadPhase)
creates the world's broad-phase entity, with an empty
[`BroadPhaseEcsComponent`](/Forge/docs/api/interfaces/BroadPhaseEcsComponent),
and returns the entity. Call it once per world, before the first update, and
register
[`createBroadPhaseEcsSystem`](/Forge/docs/api/functions/createBroadPhaseEcsSystem)
in the fixed-update group:

```ts
import {
  type CollisionPair,
  createBroadPhase,
  createBroadPhaseEcsSystem,
} from '@forge-game-engine/forge/physics';

const collisionPairs: CollisionPair[] = [];

createBroadPhase(world);
world.addSystem(createBroadPhaseEcsSystem(collisionPairs), {
  group: fixedUpdate,
});
```

`createBroadPhase` throws when the world already has a broad phase. The
broad phase system is the only system that writes the
`BroadPhaseEcsComponent` and each collider's `ColliderEcsComponent.aabb`.
Every step it clears `collisionPairs` and fills it with the pairs whose
`aabb`s overlap, which `createNarrowPhaseEcsSystem` reads (see
[Registering the physics systems](./index.md#registering-the-physics-systems)
for the order).

The broad phase system,
[continuous collision detection](./continuous-collision-detection.md) and
the [queries](./queries.md) (`raycast`, `queryAabb` and `overlapPoint`) all
read the same `BroadPhaseEcsComponent` from the world. Each of them throws
when the world has no broad phase, or more than one.

## Static, kinematic and dynamic colliders

An entity with a `PositionEcsComponent` and a `ColliderEcsComponent` is in
one of the two trees, by its [body type](./rigid-bodies.md#body-types):

- **Static colliders**, with no `RigidBodyEcsComponent` or a `'static'`
  one, are in the static tree.
- **Kinematic and dynamic colliders** are in the moving tree.

A collider whose body type changes between static and kinematic or dynamic
is moved to the other tree on the broad phase's next run.

Two static colliders are never paired, so they never collide and never
appear in each other's contacts, even when game code moves one of them.
Every other combination is paired when the two colliders' bounds overlap:
dynamic with dynamic, kinematic or static, and kinematic with kinematic or
static. A pair whose categories and masks exclude each other is never
listed (see
[Filtering which colliders collide](./collisions.md#filtering-which-colliders-collide)).

## Finding new pairs

Each step, the broad phase checks every collider. A collider whose world
position, rotation, shape and `ColliderEcsComponent` haven't changed since
the last run keeps its `aabb`. A collider where any of them changed has
its `aabb` recomputed.

When a collider is added to its tree, the tree stores the collider's `aabb`
grown by [`aabbMargin`](/Forge/docs/api/variables/aabbMargin) (`0.1` world
units) on every side, its **fat box**. A collider looks for new pairs on a step when:

- it was added, or moved to the other tree;
- its `aabb` left its fat box, or shrank so that the fat box reaches more
  than five margins beyond it on a side, and it got a new fat box;
- its `category` or `mask` changed.

Such a collider queries the moving tree with its fat box, and a kinematic
or dynamic one also queries the static tree. The other colliders don't
query either tree. A collider that moves more than `aabbMargin` along an
axis every step looks for new pairs every step; one that moves less looks for them only on
the steps it leaves its fat box, and one that rests never does.

A pair is kept from step to step until the two colliders' fat boxes stop
overlapping. On each step, the kept pairs whose `aabb`s overlap are written
to `collisionPairs`.

A collider is added to its tree on the broad phase's first run after its
entity has both a `PositionEcsComponent` and a `ColliderEcsComponent`. It
is removed from its tree, with every pair it was in, on the first run after
its entity loses either component or is removed. A collider whose `aabb`
isn't finite, such as a `ChainCollider` with no loops or a collider at a
`NaN` position, isn't in either tree and isn't paired.

A collider's shape doesn't change in place. To change it, assign a new
`Collider` to `ColliderEcsComponent.collider`, and the broad phase
recomputes its `aabb` on its next run.

## Order of the pairs

`collisionPairs` is sorted by `entityA`, then `entityB`, and `entityA` is
always the lower entity of the pair. The order doesn't depend on the order
the colliders were added to the trees or moved in, or on the shape of the
trees, so the
narrow phase and collision resolution process the same pairs in the same
order every time the same scene runs.

## When the broad phase is current

The broad phase runs once per fixed step, at its place in the fixed-update
group. Each collider's `aabb` and the trees describe the colliders as of
that run:

- A collider added since the broad phase last ran isn't in a tree, and its
  `aabb` is empty and overlaps nothing.
- The broad phase runs before integration moves the bodies, so after a
  step, a dynamic or kinematic body's `aabb` and fat box are where the body
  was at the start of that step.

A query finds its candidates in the trees as of the last run, and tests a
dynamic or kinematic body at its current `position.local` and
`rotation.local` (see [Which pose a query tests](./queries.md#which-pose-a-query-tests)).
Before the first fixed step, the trees are empty and a query finds nothing.

## Keeping collision cost down

Every step, the broad phase checks every collider for changes and checks
every kept pair's fat boxes, including the pairs of resting and
[sleeping](./sleeping.md) bodies. Its tree work grows with the number of
colliders that leave their fat boxes, not with the total number of
colliders. These choices keep that number low:

- **Keep level geometry static.** Floors, walls and platforms that don't
  move need no `RigidBodyEcsComponent`. Static colliders are never paired
  with each other, and a static collider that doesn't move does no tree
  work.
- **Give a collider that game code moves a `'kinematic'` body, and move it
  by its `velocity`.** A kinematic collider is paired with static
  colliders, and a dynamic body it touches is pushed by its velocity (see
  [Body types](./rigid-bodies.md#body-types)). A static collider that game
  code moves isn't paired with other static colliders, and has no velocity
  to push dynamic bodies with.
- **Don't teleport many static colliders every step.** Each static collider
  that moves has its `aabb` recomputed, and each one that leaves its fat
  box is moved in the static tree and queries the moving tree, every step
  it moves.
- **Build the ground from one collider.** A
  [`TerrainCollider`](./terrain.md) or a
  [`ChainCollider`](./chain-colliders.md) is one collider in the static
  tree, and a body on it is in one pair with it. Ground built from many
  small static boxes gives a body one pair for every box its fat box
  overlaps.

The [Physics Stress Test demo](/Forge/demos/physics-stress-test) shows how
many bodies a machine simulates before its frame rate drops.
