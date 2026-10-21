---
sidebar_position: 4
---

# Animated tiles

An animated tile shows the images of other tiles of its source in turn,
such as water or torches. The animation belongs to the tile in its
[tile set](./tile-sets.md), and the
[tilemap render system](./rendering.md) shows its current frame in every
cell that holds it.

## Giving a tile an animation

A tile's `animation` is a list of frames. Each frame shows the image of a
tile of the same source for `durationMilliseconds`, and the list repeats:

```ts
const terrainSource = {
  atlas: terrainAtlas,
  tiles: new Map([
    [
      4,
      {
        animation: [
          { tile: 4, durationMilliseconds: 150 },
          { tile: 5, durationMilliseconds: 150 },
          { tile: 6, durationMilliseconds: 200 },
        ],
      },
    ],
  ]),
};
```

`createTileSet` throws for an empty `animation`, a frame tile its source
doesn't have, and a duration that isn't a positive finite number. A tile
that doesn't animate has `animation: null`.

## Which frame a cell shows

The animation belongs to the tile, not to a cell. Every cell that holds the
tile, in every layer, shows the same frame at the same time. The frame is
chosen from `time.timeInMilliseconds`, the `Time` given to
`createTilemapRenderEcsSystem`: frame `0` starts at time `0` and at every
multiple of the frames' total duration. A `timeScale` of `0` pauses every
animated tile, and a larger `timeScale` speeds them up.

- A cell's transform bits apply to every frame.
- A frame shows only its tile's image. The cell keeps the placed tile's
  `textureOrigin`, `ySortOrigin`, `collision` and `properties`, and a
  frame's own animation is ignored. An animated tile collides with the
  placed tile's shape whatever frame shows (see
  [Giving a layer a collider](./collision.md#giving-a-layer-a-collider)).

[`getDisplayedTile`](/Forge/docs/api/functions/getDisplayedTile) returns
the packed tile whose image a cell shows at a time, the placed tile with
its tile index replaced by the current frame's:

```ts
import { getDisplayedTile, getTile } from '@forge-game-engine/forge/tilemaps';

const shown = getDisplayedTile(
  groundLayer.tileSet,
  getTile(groundLayer, column, row),
  time.timeInMilliseconds,
);
```

[`getTileAnimationFrameIndex`](/Forge/docs/api/functions/getTileAnimationFrameIndex)
returns the index of the frame an animation shows at a time.

## What a frame change costs

Each chunk mesh records which of its tiles are animated. On an update where
an animated tile's frame changes, the system rewrites the vertices of only
those tiles, in only the meshes that hold that tile, and uploads those
meshes' texture coordinates, 96 bytes per tile of the mesh. A mesh with no
animated tiles isn't rewritten, and frame changes never change the layer's
cells or its `version`. A
[y-sorted layer](./rendering.md#y-sorting-tiles-with-characters)'s mesh
holds a source's tiles in the whole layer, so a frame change uploads the
texture coordinates of all of them, 96 bytes per tile: keep animated floors
in layers that aren't y-sorted.
