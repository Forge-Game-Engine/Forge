---
sidebar_position: 8
---

# Dynamic AABB Tree

A [`DynamicAabbTree`](/Forge/docs/api/classes/DynamicAabbTree) is a spatial
index over axis-aligned boxes. It finds the boxes that overlap a box, or
that a line segment crosses, without testing every box, and boxes can be
added, moved and removed one at a time. Use it for a game's own spatial
queries, for example the units inside a selection box or the pickups near
the player.

The tree knows nothing about entities or colliders: each entry holds a box
and a value of the tree's type parameter, and the caller decides what goes
in it.

## Proxies and fat boxes

Each entry in the tree is a **proxy**, identified by an integer proxy id.
The tree stores a proxy's box grown by
[`aabbMargin`](/Forge/docs/api/variables/aabbMargin) (`0.1` world units) on
every side, its **fat box**. Queries test fat boxes, so they report every
box that overlaps the query and can also report boxes up to the margin away
from it. Test the exact shape in the callback when that matters.

Boxes are [`Aabb`](/Forge/docs/api/interfaces/Aabb)s in world units,
`{ min, max }` with `min` at the top-left corner.

## Adding a proxy

[`createProxy`](/Forge/docs/api/classes/DynamicAabbTree#createproxy) stores
a box with a value and returns the proxy's id:

```ts
import { DynamicAabbTree } from '@forge-game-engine/forge/physics';

const units = new DynamicAabbTree<number>();

const proxyId = units.createProxy(
  { min: { x: 2, y: 3 }, max: { x: 3, y: 4 } },
  unitEntity,
);
```

`getValue(proxyId)` returns the value, and `getFatAabb(proxyId, out)` writes
the fat box into `out`. A box must be finite with `min <= max` on both axes;
`createProxy` throws otherwise.

## Moving a proxy

When the shape a proxy stands for moves, pass its new box to
[`moveProxy`](/Forge/docs/api/classes/DynamicAabbTree#moveproxy):

```ts
const moved = units.moveProxy(proxyId, unitBounds);
```

While the new box stays inside the fat box, `moveProxy` changes nothing and
returns `false`. When the box leaves the fat box, or the fat box reaches
more than five margins beyond the box on any side because the box shrank,
the proxy gets a new fat box and `moveProxy` returns `true`. A shape that
moves less than `aabbMargin` from where its box was last stored costs no
tree work.

## Finding the proxies that overlap a box

[`query`](/Forge/docs/api/classes/DynamicAabbTree#query) calls a callback
with the id and value of every proxy whose fat box overlaps a box. Touching
edges count as overlapping.

```ts
const selected: number[] = [];

units.query(selectionBox, (proxyId, unitEntity) => {
  selected.push(unitEntity);

  return true;
});
```

Return `true` to continue and `false` to stop the query. Proxies are visited
in the tree's order, not in any spatial order. The query box's sides may be
infinite.

:::caution
A callback can query the same tree again, but `createProxy`, `destroyProxy`,
`moveProxy` and `clear` throw while a `query` or `raycast` of the tree is
running. Collect what to change in the callback and change the tree after
the query returns.
:::

## Casting a segment through the tree

[`raycast`](/Forge/docs/api/classes/DynamicAabbTree#raycast) calls a
callback for every proxy whose fat box the segment from `start` to `end`
reaches. The callback receives the proxy's id, the current `maxFraction`
and the proxy's value, and returns how much of the segment to keep casting:

- `0` stops the cast.
- A fraction between `0` and `maxFraction` clips the segment there, so
  proxies beyond that point are skipped.
- `maxFraction` continues with the segment unchanged.

`maxFraction` starts at `1`, the whole segment. Clipping at each hit finds
the closest one:

```ts
let closest: number | null = null;

units.raycast(start, end, (proxyId, maxFraction, unitEntity) => {
  const fraction = segmentHitsUnit(unitEntity, start, end);

  if (fraction === null || fraction >= maxFraction) {
    return maxFraction;
  }

  closest = unitEntity;

  return fraction;
});
```

Here `segmentHitsUnit` is the game's own exact test, returning the fraction
of the segment where it hits the unit, or `null`. Proxies are visited in
the tree's order, not by distance. Any other return value throws.

## Removing proxies

[`destroyProxy`](/Forge/docs/api/classes/DynamicAabbTree#destroyproxy)
removes one proxy, and
[`clear`](/Forge/docs/api/classes/DynamicAabbTree#clear) removes every
proxy:

```ts
units.destroyProxy(proxyId);
```

A later `createProxy` can return a removed proxy's id, so forget the id when
you remove its proxy. Reading or moving a removed proxy throws until its id
is given to a new proxy.
