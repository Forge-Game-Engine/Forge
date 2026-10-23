---
sidebar_position: 1
---

# Tile sets

A [`TileSet`](/Forge/docs/api/interfaces/TileSet) says where a tilemap's
cells are and what each of its tiles is: the image it draws, its custom
properties, its collision shape and its animation. Layers hold tiles as
[packed tiles](#packed-tiles), which name a tile of their tile set.

## Creating a tile set

A tile set holds a [grid layout](../math/grid-layouts.md) and one or more
sources. [`createTileSet`](/Forge/docs/api/functions/createTileSet) builds
one:

```ts
import { createOrthogonalGridLayout } from '@forge-game-engine/forge/math';
import { createGridTextureAtlas } from '@forge-game-engine/forge/rendering';
import { createTileSet } from '@forge-game-engine/forge/tilemaps';

const tileSet = createTileSet({
  layout: createOrthogonalGridLayout({ cellWidth: 16, cellHeight: 16 }),
  sources: [
    {
      atlas: createGridTextureAtlas(terrainTexture, {
        cellWidth: 16,
        cellHeight: 16,
      }),
    },
  ],
});
```

A tile set is frozen. Any number of layers use the same one.
[Loading Tiled maps](./loading-tiled-maps.md) builds a tile set from a
map's Tiled tilesets.

## Sources

A source is one [texture atlas](../rendering/texture-atlases.md). Every
region of the atlas is a tile, and a tile's index is its region's index in
`atlas.regions`, which is row-major for a grid atlas. A tile set has up to
`256` sources, so one map can use several textures, such as a terrain sheet
and a prop sheet. A tile names its source by its index in `sources`.

Every tile of a source draws at the source's `tileWidth` by `tileHeight`, in
the layer's local units, whatever its region's size in texels. They default
to the layout's `cellWidth` and `cellHeight`. A source whose tiles are taller
than a cell, such as isometric walls, sets its own:

```ts
const wallSource = {
  atlas: createGridTextureAtlas(wallTexture, { cellWidth: 64, cellHeight: 96 }),
  tileHeight: 96,
};
```

## Tile data

Each tile has a [`TileData`](/Forge/docs/api/interfaces/TileData): custom
`properties`, a `textureOrigin` (see
[Tile image placement](#tile-image-placement)), a `ySortOrigin` (see
[Where a tile sorts](./rendering.md#where-a-tile-sorts)), a `collision`
shape (see [Collision shapes](./collision.md#collision-shapes)), an
`animation` (see [Animated tiles](./animated-tiles.md)) and a
`navigationCost` (see
[Giving tiles a navigation cost](./navigation.md#giving-tiles-a-navigation-cost)).
A source's `tiles` map sets them for the tiles that need them, by tile
index; every other tile has no properties, a `(0, 0)` `textureOrigin`, a
`0` `ySortOrigin`, no collision, no animation and a `null`
`navigationCost`:

```ts
const terrainSource = {
  atlas: terrainAtlas,
  tiles: new Map([
    [4, { properties: { water: true, speed: 0.5 } }],
    [5, { properties: { door: true } }],
  ]),
};
```

Property values are strings, numbers or booleans. In the created tile set,
`tileSet.sources[i].tiles` is an array holding every tile's `TileData`, one
per atlas region, by tile index.

## Layouts

The tile set's layout places every cell, so the same tilemap code works for
an orthogonal map (`createOrthogonalGridLayout`) and an isometric one
(`createIsometricGridLayout`). Columns increase towards `+X` and rows towards
`+Y`, down the screen, and cell `(0, 0)` is placed by the layout at the
layer entity's origin. [Grid Layouts](../math/grid-layouts.md) describes
where each layout puts a cell.

## Packed tiles

A cell holds a packed tile: an unsigned 32-bit integer naming a source, a
tile in it and how its image is turned or mirrored.
[`emptyTile`](/Forge/docs/api/variables/emptyTile) (`0`) is an empty cell.
[`packTile`](/Forge/docs/api/functions/packTile) builds one, and
[`unpackTile`](/Forge/docs/api/functions/unpackTile) reads its fields:

```ts
import { packTile, unpackTile } from '@forge-game-engine/forge/tilemaps';

const grass = packTile({ source: 0, tile: 3 });
const { source, tile, flipX } = unpackTile(grass);
```

Two packed tiles are the same tile in the same orientation when they're
equal (`===`).

| Bits  | Field     | Meaning                                                                      |
| ----- | --------- | ---------------------------------------------------------------------------- |
| 31    | flipX     | Mirror the image left to right                                               |
| 30    | flipY     | Mirror the image top to bottom on screen                                     |
| 29    | transpose | Swap the image's X and Y axes (mirror across its top-left/bottom-right line) |
| 28    | present   | Always `1` in a non-empty tile, so no tile packs to `0`                      |
| 20–27 | source    | Source index, `0` to `255`                                                   |
| 0–19  | tile      | Tile index in the source, `0` to `1,048,575`                                 |

The flip bits are in the same place as the flip flags of a Tiled tile and
mean the same thing.

### Turning and mirroring tiles

The three transform bits move the image's content inside its rectangle:
transpose first, then flip X, then flip Y. Together they give all eight
90-degree rotations and mirrors:

| `transpose` | `flipX` | `flipY` | On screen                                      |
| ----------- | ------- | ------- | ---------------------------------------------- |
| `false`     | `false` | `false` | As drawn                                       |
| `false`     | `true`  | `false` | Mirrored left to right                         |
| `false`     | `false` | `true`  | Mirrored top to bottom                         |
| `false`     | `true`  | `true`  | Turned 180 degrees                             |
| `true`      | `true`  | `false` | Turned 90 degrees clockwise                    |
| `true`      | `false` | `true`  | Turned 90 degrees counter-clockwise            |
| `true`      | `false` | `false` | Mirrored across the top-left/bottom-right line |
| `true`      | `true`  | `true`  | Mirrored across the top-right/bottom-left line |

```ts
const turnedClockwise = packTile({
  source: 0,
  tile: 3,
  transpose: true,
  flipX: true,
});
```

In normalized image coordinates (`(0, 0)` top-left, `(1, 1)` bottom-right),
transpose moves content at `(u, v)` to `(v, u)`, flip X to `(1 - u, v)` and
flip Y to `(u, 1 - v)`. Code that draws a tile by choosing texture
coordinates uses the inverse: the point `p` of the drawn rectangle shows the
image at the flips undone, then the transpose undone. The two 90-degree turns
are the only combinations that differ from their inverse.

A transposed tile that isn't square is turned, not stretched: its rectangle
swaps its width and height (see [Tile image placement](#tile-image-placement)).
The bits turn a tile's collision shape the same way (see
[Turned and mirrored shapes](./collision.md#turned-and-mirrored-shapes)).

## Tile image placement

[`getTileImageRect`](/Forge/docs/api/functions/getTileImageRect) returns
where a tile's image is when it's in a cell, in the layer's local space:

```ts
import { getTileImageRect } from '@forge-game-engine/forge/tilemaps';

const imageRect = getTileImageRect(tileSet, column, row, tile);
```

The image is its source's `tileWidth` by `tileHeight`. Its bottom-left
corner is on the bottom-left corner of the cell footprint's bounds, then it
moves by the tile's `textureOrigin`, Y-down: a positive `y` moves it down.
An image taller than its cell reaches up from the cell's footprint. This
is the rule Tiled uses, so a tile from a Tiled tileset is placed where Tiled
draws it.

A tile with its transpose bit set is `tileHeight` wide and `tileWidth`
tall, with the same bottom-left corner: a 16 by 32 tile turned on its side
covers 32 by 16. The flip bits don't change the rectangle.

:::caution
Cells draw back to front when each tile's image is at most `cellWidth`
wide, has a `textureOrigin.x` of `0` and a `textureOrigin.y` of `0` or
less (see [Drawing cells back to front](../math/grid-layouts.md#drawing-cells-back-to-front)).
A tile outside those limits, such as a prop that overhangs its cell, can
draw in the wrong order against its neighbors.
:::
