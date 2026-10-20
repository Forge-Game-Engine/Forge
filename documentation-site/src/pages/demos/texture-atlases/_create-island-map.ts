import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { addPositionComponent } from '@forge-game-engine/forge/common';
import {
  addSpriteComponent,
  createAtlasSprite,
  createGridTextureAtlas,
  RenderContext,
  TextureAtlas,
} from '@forge-game-engine/forge/rendering';

// The tile sheet is 16 columns by 6 rows of 64 x 64 texel tiles, with no
// spacing or margin, so a tile's index is `row * 16 + column`. Drawing 64
// texels per world unit makes each tile one world unit square, so a tile's
// column and row are its position.
const tileSize = 64;
const sheetColumns = 16;
export const pixelsPerUnit = tileSize;

const tiles = {
  water: 72,
  sandIsland: { first: 0, columns: 3, rows: 3 },
  grassIsland: { first: 5, columns: 4, rows: 4 },
  rocks: [48, 49, 50],
  plants: [69, 70, 71],
};

// The map, in tiles from the center of the screen.
const waterColumns = { from: -10, to: 10 };
const waterRows = { from: -5, to: 5 };
const sandIslandAt = { column: -7, row: -3 };
const grassIslandAt = { column: 1, row: -3 };
const props = [
  { tile: tiles.rocks[0], column: -5, row: 2 },
  { tile: tiles.rocks[1], column: -2, row: -3 },
  { tile: tiles.rocks[2], column: 6, row: 2 },
  { tile: tiles.plants[0], column: -6, row: -2 },
  { tile: tiles.plants[1], column: 2, row: -2 },
  { tile: tiles.plants[2], column: 3, row: -1 },
];

function addTile(
  world: EcsWorld,
  atlas: TextureAtlas,
  tile: number,
  column: number,
  row: number,
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, {
    local: { x: column, y: row },
  });
  addSpriteComponent(
    world,
    entity,
    createAtlasSprite(atlas, tile, { pixelsPerUnit }),
  );
}

function addIsland(
  world: EcsWorld,
  atlas: TextureAtlas,
  island: { first: number; columns: number; rows: number },
  at: { column: number; row: number },
): void {
  for (let row = 0; row < island.rows; row++) {
    for (let column = 0; column < island.columns; column++) {
      addTile(
        world,
        atlas,
        island.first + row * sheetColumns + column,
        at.column + column,
        at.row + row,
      );
    }
  }
}

/**
 * Cuts the tile sheet into a grid atlas and draws a small map from it by
 * tile index: water everywhere, two islands, and rocks and plants on top.
 * Every tile is a sprite of the same texture, so they all draw in one batch.
 * @param world - The world to add the tiles to.
 * @param renderContext - The render context to load the tile sheet into.
 */
export async function createIslandMap(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<void> {
  const texture = await renderContext.textureCache.getOrLoad(
    getAssetUrl('img/kenney_pirate-pack/Tilesheet/tiles_sheet.png'),
  );
  const atlas = createGridTextureAtlas(texture, {
    cellWidth: tileSize,
    cellHeight: tileSize,
  });

  for (let row = waterRows.from; row <= waterRows.to; row++) {
    for (let column = waterColumns.from; column <= waterColumns.to; column++) {
      addTile(world, atlas, tiles.water, column, row);
    }
  }

  addIsland(world, atlas, tiles.sandIsland, sandIslandAt);
  addIsland(world, atlas, tiles.grassIsland, grassIslandAt);

  for (const { tile, column, row } of props) {
    addTile(world, atlas, tile, column, row);
  }
}
