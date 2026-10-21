import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { createIsometricGridLayout } from '@forge-game-engine/forge/math';
import {
  addDrawOrderComponent,
  addSpriteComponent,
  addVisibilityComponent,
  createGridTextureAtlas,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import {
  addTilemapLayerComponent,
  cellToLocal,
  createTileSet,
  fillTiles,
  packTile,
  setTile,
} from '@forge-game-engine/forge/tilemaps';
import { DemoMap } from './_demo-map';
import {
  createCellOutline,
  createCharacterTexture,
  createIsometricSheet,
  isometricCell,
  isometricHeights,
  isometricTiles,
  isometricTileSize,
} from './_tile-sheets';
import { addWalkerComponent } from './_walker.component';

const size = 10;

const tile = (index: number): number => packTile({ source: 0, tile: index });

const stone = tile(isometricTiles.stone);
const grass = tile(isometricTiles.grass);
const hedge = tile(isometricTiles.hedge);
const wall = tile(isometricTiles.wall);

/**
 * Builds the isometric map: a floor layer, a y-sorted layer of hedges and
 * tall walls, and a character walking among them, hidden until the page
 * switches to it.
 *
 * Every tile is 80 x 120, a cell wide and three cells tall, and stands on
 * the diamond at the bottom of its image, so walls rise over the cells
 * behind them. The wall layer's entity sets `ySortChildren`, so it draws as
 * one sort row per diagonal of cells, each sorted by its Y under the
 * camera's `ySort`: the character draws in front of the walls above it on
 * screen and behind the ones below it. The map's root sets `ySortChildren`
 * too, so the rows sort against the character, a child of the root. The
 * floor layer has an order of `-1`, so it draws behind everything.
 * @param world - The world to build the map in.
 * @param renderContext - The render context to create the textures in.
 * @returns The map's root, layers, cursor and brushes.
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
            {
              properties: { name: 'Stone floor', height: 0, walkable: true },
            },
          ],
          [
            isometricTiles.grass,
            {
              properties: {
                name: 'Grass',
                height: 0,
                walkable: true,
                speed: 0.8,
              },
            },
          ],
          [
            isometricTiles.hedge,
            {
              properties: {
                name: 'Hedge',
                height: isometricHeights.hedge,
                walkable: false,
              },
            },
          ],
          [
            isometricTiles.wall,
            {
              properties: {
                name: 'Stone wall',
                height: isometricHeights.wall,
                walkable: false,
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

  // Each child of the root is a sort unit: the floor, the wall layer and
  // the character.
  addDrawOrderComponent(world, root, { ySortChildren: true });

  const floor = world.createEntity();

  addPositionComponent(world, floor);
  addDrawOrderComponent(world, floor, { order: -1 });
  world.setParent(floor, root);
  const floorLayer = addTilemapLayerComponent(world, floor, { tileSet });

  fillTiles(floorLayer, 0, 0, size, size, stone);
  fillTiles(floorLayer, 5, 5, 4, 4, grass);

  const walls = world.createEntity();

  addPositionComponent(world, walls);
  // A y-sorted layer: its tiles sort with the character row by row.
  addDrawOrderComponent(world, walls, { ySortChildren: true });
  world.setParent(walls, root);
  const wallLayer = addTilemapLayerComponent(world, walls, { tileSet });

  // Walls along the two back edges, and a few pillars in front of them.
  fillTiles(wallLayer, 0, 0, size, 1, wall);
  fillTiles(wallLayer, 0, 1, 1, size - 1, wall);
  setTile(wallLayer, 3, 3, wall);
  setTile(wallLayer, 3, 6, wall);
  setTile(wallLayer, 6, 3, wall);
  fillTiles(wallLayer, 5, 5, 4, 1, hedge);
  fillTiles(wallLayer, 5, 6, 1, 3, hedge);

  // A child of the root at the layers' origin, so its local position is in
  // their local space. Its feet are at its position, the point it sorts at.
  const character = world.createEntity();

  addPositionComponent(world, character, {
    local: cellToLocal(floorLayer, 2, 4),
  });
  addSpriteComponent(world, character, {
    ...createImageSprite(createCharacterTexture(renderContext), {
      pixelsPerUnit: 1,
    }),
    pivot: { x: 0.5, y: 0.9 },
  });
  addWalkerComponent(world, character, {
    layers: [floor, walls],
    speed: 140,
  });
  world.setParent(character, root);

  // A child of the wall layer with a higher order than its rows, so it
  // draws over every tile.
  const cursor = world.createEntity();

  addPositionComponent(world, cursor);
  addDrawOrderComponent(world, cursor, { order: 1 });
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
  world.setParent(cursor, walls);

  return {
    visibility,
    layers: [
      { name: 'Floor', entity: floor },
      { name: 'Walls', entity: walls },
    ],
    cursor,
    brushes: [
      { name: 'Wall', layer: walls, tile: wall },
      { name: 'Hedge', layer: walls, tile: hedge },
      { name: 'Stone', layer: floor, tile: stone },
      { name: 'Grass', layer: floor, tile: grass },
    ],
  };
}
