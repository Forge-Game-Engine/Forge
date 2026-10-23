---
sidebar_position: 8
---

# Navigation over tile layers

A [navigation grid](../navigation/grids.md) over a tile layer takes its
blocked cells from the layer's collider and its cell costs from the layer's
tiles, so a tiled level's walls and terrain are described once, in its tile
set.

## Laying a grid over a layer

A grid with the layer's layout, its `origin` at the layer's world position
and the layer's used cells has the layer's cells, by number and by position,
on orthogonal and isometric layers alike. See
[Laying a grid over a tile layer](../navigation/grids.md#laying-a-grid-over-a-tile-layer)
for the code.

## Blocking the cells of solid tiles

A layer with a [collider](./collision.md#giving-a-layer-a-collider) has a
static `ChainCollider` built from its tiles' collision shapes.
[`markGridFromColliders`](../navigation/colliders.md) bakes it like any
other static collider:

```ts
import { markGridFromColliders } from '@forge-game-engine/forge/navigation';

markGridFromColliders(world, grid, { agentRadius: 6 });
```

A cell is blocked when its area overlaps a solid tile's shape, so a slope
blocks the cells it crosses, and a cell inside a hole in the layer's
outline stays walkable. The collider is built by
`createTilemapColliderEcsSystem`, so bake after a `world.update()` has run
it.

## Giving tiles a navigation cost

A tile's `navigationCost` multiplies the cost of every step into a grid
cell over that tile: `0.5` makes a cell cheaper than one of cost `1`, `3`
makes it more expensive. Set it in the tile's data (see
[Tile data](./tile-sets.md#tile-data)):

```ts
import { createTileSet } from '@forge-game-engine/forge/tilemaps';

const tileSet = createTileSet({
  layout,
  sources: [
    {
      atlas: terrainAtlas,
      tiles: new Map([
        [0, { navigationCost: 0.5 }],
        [3, { navigationCost: 3 }],
        [7, { collision: 'cell' }],
      ]),
    },
  ],
});
```

A tile without a `navigationCost` has `null`, which leaves a grid cell's
cost as it is. `createTileSet` throws for a cost that isn't finite and
more than `0` as a 32-bit float. A cost never blocks a cell: a tile that
blocks has a `collision` shape. In a [Tiled map](./loading-tiled-maps.md),
a tile's `navigationCost` custom property sets it.

## Applying tile costs to a grid

[`applyTilemapNavigationCosts`](/Forge/docs/api/functions/applyTilemapNavigationCosts)
sets the cost of every cell of a grid from a layer:

```ts
import { applyTilemapNavigationCosts } from '@forge-game-engine/forge/tilemaps';

applyTilemapNavigationCosts(world, floor, grid);
```

Each grid cell takes the `navigationCost` of the tile under the cell's
centre. A cell over an empty cell, or over a tile whose `navigationCost`
is `null`, keeps its cost. Walkability doesn't change, so a blocked cell
stays blocked and keeps the cost it has when it's opened. `grid.version`
increases once when any cost changed.

The centre is mapped into the layer through the layer entity's world
position, rotation and scale, as
[`worldToCell`](/Forge/docs/api/functions/worldToCell) maps it, so the
grid doesn't need the layer's layout, cell size, origin or cells. A grid
with smaller cells gives each of its cells the cost of the tile it's in,
and a grid with larger cells takes the tile under each cell's centre.

:::caution

`markGridFromColliders` doesn't apply scale, as physics doesn't. On a
scaled layer the costs follow the drawn tiles and the blocked cells don't,
so the two bakes agree only on an unscaled layer.

:::

## Applying several layers

Apply each layer that carries costs, in order. A later layer's costs
replace an earlier one's, and its cells with no tile or a `null` cost keep
the earlier costs:

```ts
applyTilemapNavigationCosts(world, ground, grid);
applyTilemapNavigationCosts(world, roads, grid);
```

## Baking again after an edit

Neither bake undoes its own changes: `markGridFromColliders` only blocks
cells and `applyTilemapNavigationCosts` only sets costs. After the level's
tiles change, reset the grid and bake both again:

```ts
grid.fillWalkable(grid.cells, true);
grid.fillCost(grid.cells, 1);
markGridFromColliders(world, grid);
applyTilemapNavigationCosts(world, floor, grid);
```

Bake when the level loads and after it changes, not every frame. A layer's
`version` increases each time its tiles change, so comparing it with the
version the grid was baked at tells when to bake again.
