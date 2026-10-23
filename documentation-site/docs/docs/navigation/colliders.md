---
sidebar_position: 3
---

# Blocking cells from colliders

[`markGridFromColliders`](/Forge/docs/api/functions/markGridFromColliders)
blocks every cell of a [navigation grid](./grids.md) that a static physics
collider overlaps, so a level's walls and obstacles are described once,
as colliders, and the grid is built from them.

## Baking a grid from colliders

Call `markGridFromColliders` with the world that holds the colliders and
the grid to mark:

```ts
import { createOrthogonalGridLayout } from '@forge-game-engine/forge/math';
import {
  createNavigationGrid,
  markGridFromColliders,
} from '@forge-game-engine/forge/navigation';

const grid = createNavigationGrid({
  cells: { minColumn: 0, minRow: 0, maxColumn: 63, maxRow: 47 },
  layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
  origin: { x: -512, y: -384 },
});

markGridFromColliders(world, grid, { agentRadius: 12 });
```

Each collider's cells are set to blocked. It doesn't make any cell
walkable, so cells blocked before the call stay blocked. `grid.version`
increases once when the call blocks at least one cell.

This is a bake step: run it when the level is loaded and again after the
level changes, not every frame. Its cost grows with the number of colliders
and the cells they cover.

## Which colliders block cells

A collider is baked when its entity has a `PositionEcsComponent` and a
`ColliderEcsComponent`, and:

- it has no `RigidBodyEcsComponent`, or a `'static'` one (see
  [Body types](../physics/rigid-bodies.md#body-types)). `'dynamic'` and
  `'kinematic'` bodies move, so they're skipped;
- it isn't a [sensor](../physics/collisions.md#sensors);
- its `category` shares a bit with the `mask` option (see
  [Choosing collision categories](#choosing-collision-categories)).

Each shape is placed where physics places it: by the entity's
`position.world` and `rotation.world`, unrotated when the entity has no
`RotationEcsComponent`. Like physics, the bake doesn't apply
`ScaleEcsComponent`.

## How shapes block cells

A cell is blocked when any part of its area overlaps the shape, not only
its centre. A wall thinner than a cell blocks every cell it crosses:

```text
. . | . .     The wall | is narrower than a cell and misses the
. . | . .     cell centres. Every cell it crosses is blocked.
```

A shape that only touches a cell's edge or corner doesn't block it. A box
whose sides lie on cell boundaries blocks the cells inside it and none of
their neighbors, and a [tile layer's collider](../tilemaps/collision.md)
blocks exactly its solid tiles' cells on a grid with the same layout and
an `origin` at the layer's world position.

Each kind of collider blocks this area:

| Collider          | Blocked area                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CircleCollider`  | The circle.                                                                                                                                                                             |
| `PolygonCollider` | The polygon.                                                                                                                                                                            |
| `TerrainCollider` | The whole slab: from the surface down to the bottom edge (see [Terrain](../physics/terrain.md)).                                                                                        |
| `ChainCollider`   | The solid its loops enclose. Holes are left open, and a hole loop on its own blocks everything outside it (see [Chain colliders](../physics/chain-colliders.md#loops-solid-and-holes)). |

:::note
A chain whose outermost loops disagree, such as a solid loop beside a
separate hole loop, has no single outside. The loop with the largest area
decides: when it's a hole, everything outside every loop is blocked.
:::

## Keeping units clear of walls

The `agentRadius` option grows every shape by that many world units before
marking, with rounded corners. A cell stays walkable only when its whole
area is more than `agentRadius` from every collider, so a unit of that
radius standing in a walkable cell doesn't overlap a collider:

```ts
markGridFromColliders(world, grid, { agentRadius: 12 });
```

The default is `0`. Units of different sizes need a grid each, baked with
their own radius.

A unit that follows a path from [`findGridPath`](./grids.md#finding-a-path-between-world-positions)
stays clear of the colliders by `agentRadius` with the default
`'noCornerCutting'` [diagonal rule](./grids.md#diagonal-movement). With
`'always'`, a diagonal step can pass the corner of a blocked cell, closer
to a collider than `agentRadius`.

The padding is measured against whole cells, so a gap between two
colliders that is just wide enough for the unit can still be closed in the
grid.

## Choosing collision categories

The `mask` option bakes only colliders whose `category` shares a bit with
it (see
[Filtering which colliders collide](../physics/collisions.md#filtering-which-colliders-collide)).
Pass the `mask` of the units that will walk the grid, so the grid blocks
what they collide with:

```ts
markGridFromColliders(world, grid, { mask: walkerMask });
```

The default, `allCollisionCategories`, bakes every category.

## When to bake

The bake reads `position.world` and `rotation.world`, which
`createTransformEcsSystem` writes, and a tile layer's collider, which
`createTilemapColliderEcsSystem` builds. Run it after one `world.update()`
has run those systems for the level's entities:

```ts
// After creating the level's entities:
world.update();

markGridFromColliders(world, grid, { agentRadius: 12 });
```

Baked before that, a child entity's collider is placed at its local
position, and a tile layer has no collider yet.

## Baking again after a change

The bake only blocks cells. When a collider moves or is removed, make the
affected cells walkable with
[`fillWalkable`](./grids.md#blocking-cells), then bake again:

```ts
grid.fillWalkable(grid.cells, true);
markGridFromColliders(world, grid, { agentRadius: 12 });
```

The range can be the whole grid or only the cells around the old and new
positions, grown by `agentRadius`. `fillWalkable` also opens cells that
were blocked with `setWalkable` or `fillWalkable`, so block those cells
again after the bake.
