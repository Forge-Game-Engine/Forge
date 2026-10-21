import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { createIsometricGridLayout } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  addVisibilityComponent,
  createGridTextureAtlas,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  addTilemapLayerComponent,
  createTileSet,
  fillTiles,
  packTile,
  setTile,
} from '@forge-game-engine/forge/tilemaps';
import { DemoMap } from './_demo-map';
import {
  createCellOutline,
  createIsometricSheet,
  isometricCell,
  isometricHeights,
  isometricTiles,
  isometricTileSize,
} from './_tile-sheets';

const size = 10;

const tile = (index: number): number => packTile({ source: 0, tile: index });

const stone = tile(isometricTiles.stone);
const grass = tile(isometricTiles.grass);
const hedge = tile(isometricTiles.hedge);
const wall = tile(isometricTiles.wall);

/**
 * Builds the isometric map: one layer of floors, hedges and tall walls,
 * hidden until the page switches to it.
 *
 * Every tile is 80 x 120, a cell wide and three cells tall, and stands on
 * the diamond at the bottom of its image, so walls rise over the cells
 * behind them. The layer draws its cells in row-major order, which for an
 * isometric layout is back to front, so a wall nearer the bottom of the
 * screen covers the ones behind it. The floors and walls share one atlas,
 * so they're one source, drawn as one mesh per chunk in that order.
 * @param world - The world to build the map in.
 * @param renderContext - The render context to create the textures in.
 * @returns The map's root, layer, cursor and brushes.
 */
export function createIsometricMap(
  world: EcsWorld,
  renderContext: RenderContext,
): DemoMap {
  const sheet = createIsometricSheet(renderContext);
  const tileSet = createTileSet({
    layout: createIsometricGridLayout({
      cellWidth: isometricCell.width,
      cellHeight: isometricCell.height,
    }),
    sources: [
      {
        atlas: createGridTextureAtlas(sheet, {
          cellWidth: isometricTileSize.width,
          cellHeight: isometricTileSize.height,
        }),
        // Taller than a cell: the image reaches up from the cell's diamond.
        tileWidth: isometricTileSize.width,
        tileHeight: isometricTileSize.height,
        tiles: new Map([
          [
            isometricTiles.stone,
            { properties: { name: 'Stone floor', height: 0 } },
          ],
          [isometricTiles.grass, { properties: { name: 'Grass', height: 0 } }],
          [
            isometricTiles.hedge,
            { properties: { name: 'Hedge', height: isometricHeights.hedge } },
          ],
          [
            isometricTiles.wall,
            {
              properties: {
                name: 'Stone wall',
                height: isometricHeights.wall,
              },
            },
          ],
        ]),
      },
    ],
  });

  // Cell (0, 0)'s top corner is at the root's origin. The map reaches from
  // the top of the back wall, a wall's height above it, down to the front
  // cell's bottom corner, so the root moves up by half of that to center
  // the map on the camera.
  const top = -isometricHeights.wall;
  const bottom = size * isometricCell.height;
  const root = world.createEntity();

  addPositionComponent(world, root, {
    local: { x: 0, y: -(top + bottom) / 2 },
  });
  const visibility = addVisibilityComponent(world, root, { visible: false });

  const ground = world.createEntity();

  addPositionComponent(world, ground);
  world.setParent(ground, root);
  const layer = addTilemapLayerComponent(world, ground, { tileSet });

  fillTiles(layer, 0, 0, size, size, stone);
  fillTiles(layer, 5, 5, 4, 4, grass);
  // Walls along the two back edges, and a few pillars in front of them.
  fillTiles(layer, 0, 0, size, 1, wall);
  fillTiles(layer, 0, 1, 1, size - 1, wall);
  setTile(layer, 3, 3, wall);
  setTile(layer, 3, 6, wall);
  setTile(layer, 6, 3, wall);
  fillTiles(layer, 5, 5, 4, 1, hedge);
  fillTiles(layer, 5, 6, 1, 3, hedge);

  // A child of the layer, so it draws over its tiles.
  const cursor = world.createEntity();

  addPositionComponent(world, cursor);
  addSpriteComponent(
    world,
    cursor,
    createImageSprite(
      createCellOutline(
        renderContext,
        'diamond',
        isometricCell.width,
        isometricCell.height,
      ),
      { pixelsPerUnit: 1 },
    ),
  );
  world.setParent(cursor, ground);

  return {
    visibility,
    layers: [{ name: 'Ground', entity: ground }],
    cursor,
    brushes: [
      { name: 'Wall', layer: ground, tile: wall },
      { name: 'Hedge', layer: ground, tile: hedge },
      { name: 'Stone', layer: ground, tile: stone },
      { name: 'Grass', layer: ground, tile: grass },
    ],
  };
}
