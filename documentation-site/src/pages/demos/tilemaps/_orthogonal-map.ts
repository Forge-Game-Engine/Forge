import { addPositionComponent } from '@forge-game-engine/forge/common';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { createOrthogonalGridLayout } from '@forge-game-engine/forge/math';
import {
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
  createOrthogonalSheet,
  orthogonalTiles,
  orthogonalTileSize,
} from './_tile-sheets';
import { addWalkerComponent } from './_walker.component';

const columns = 22;
const rows = 14;

const tile = (index: number): number => packTile({ source: 0, tile: index });

const grass = tile(orthogonalTiles.grass);
const path = tile(orthogonalTiles.path);
const water = tile(orthogonalTiles.water);
const sand = tile(orthogonalTiles.sand);
const canopy = tile(orthogonalTiles.canopy);
const arch = tile(orthogonalTiles.arch);

/**
 * Builds the orthogonal map: a ground layer with grass, paths and a pond, a
 * character walking on it, and a cover layer of tree canopies and stone
 * arches the character walks under.
 *
 * Both layers are children of the map's root, so the cover layer, the later
 * sibling, draws over the ground layer. The character is a child of the
 * ground layer: its children draw after the layer's chunk meshes, so the
 * character draws over the ground and under the cover, and its local
 * position is in the ground layer's local space, where `localToCell` finds
 * the cell it stands on.
 * @param world - The world to build the map in.
 * @param renderContext - The render context to create the textures in.
 * @returns The map's root, layers, cursor and brushes.
 */
export function createOrthogonalMap(
  world: EcsWorld,
  renderContext: RenderContext,
): DemoMap {
  const sheet = createOrthogonalSheet(renderContext);
  const tileSet = createTileSet({
    layout: createOrthogonalGridLayout({
      cellWidth: orthogonalTileSize,
      cellHeight: orthogonalTileSize,
    }),
    sources: [
      {
        atlas: createGridTextureAtlas(sheet, {
          cellWidth: orthogonalTileSize,
          cellHeight: orthogonalTileSize,
        }),
        // What the walker and the readout know about each tile.
        tiles: new Map([
          [
            orthogonalTiles.grass,
            { properties: { name: 'Grass', walkable: true, speed: 1 } },
          ],
          [
            orthogonalTiles.path,
            { properties: { name: 'Dirt path', walkable: true, speed: 1.6 } },
          ],
          [
            orthogonalTiles.water,
            {
              properties: { name: 'Water', walkable: false },
              // Every water cell shows the same frame at the same time.
              animation: [
                orthogonalTiles.water,
                orthogonalTiles.waterRipple,
                orthogonalTiles.waterSwell,
              ].map((frame) => ({ tile: frame, durationMilliseconds: 250 })),
            },
          ],
          [
            orthogonalTiles.sand,
            { properties: { name: 'Sand', walkable: true, speed: 0.6 } },
          ],
          [
            orthogonalTiles.canopy,
            { properties: { name: 'Tree canopy', cover: true } },
          ],
          [
            orthogonalTiles.arch,
            { properties: { name: 'Stone arch', cover: true } },
          ],
        ]),
      },
    ],
  });

  // The root places cell (0, 0) so the map is centered on the camera.
  const root = world.createEntity();

  addPositionComponent(world, root, {
    local: {
      x: (-columns * orthogonalTileSize) / 2,
      y: (-rows * orthogonalTileSize) / 2,
    },
  });
  const visibility = addVisibilityComponent(world, root);

  const ground = world.createEntity();

  addPositionComponent(world, ground);
  world.setParent(ground, root);
  const groundLayer = addTilemapLayerComponent(world, ground, { tileSet });

  fillTiles(groundLayer, 0, 0, columns, rows, grass);
  fillTiles(groundLayer, 12, 1, 8, 6, sand);
  fillTiles(groundLayer, 13, 2, 6, 4, water);
  fillTiles(groundLayer, 0, 9, columns, 1, path);
  fillTiles(groundLayer, 6, 0, 1, rows, path);

  const cover = world.createEntity();

  addPositionComponent(world, cover);
  world.setParent(cover, root);
  const coverLayer = addTilemapLayerComponent(world, cover, { tileSet });

  fillTiles(coverLayer, 1, 2, 3, 2, canopy);
  fillTiles(coverLayer, 8, 4, 3, 3, canopy);
  fillTiles(coverLayer, 2, 11, 2, 2, canopy);
  fillTiles(coverLayer, 15, 11, 4, 2, canopy);
  setTile(coverLayer, 6, 4, arch);
  setTile(coverLayer, 17, 9, arch);

  const character = world.createEntity();

  addPositionComponent(world, character, {
    local: cellToLocal(groundLayer, 6, 9),
  });
  addSpriteComponent(
    world,
    character,
    createImageSprite(createCharacterTexture(renderContext), {
      pixelsPerUnit: 1,
    }),
  );
  addWalkerComponent(world, character, { ground, speed: 140 });
  world.setParent(character, ground);

  // A child of the top layer, so it draws over both layers.
  const cursor = world.createEntity();

  addPositionComponent(world, cursor);
  addSpriteComponent(
    world,
    cursor,
    createImageSprite(
      createCellOutline(
        renderContext,
        'square',
        orthogonalTileSize,
        orthogonalTileSize,
      ),
      { pixelsPerUnit: 1 },
    ),
  );
  world.setParent(cursor, cover);

  return {
    visibility,
    layers: [
      { name: 'Ground', entity: ground },
      { name: 'Cover', entity: cover },
    ],
    cursor,
    brushes: [
      { name: 'Grass', layer: ground, tile: grass },
      { name: 'Path', layer: ground, tile: path },
      { name: 'Water', layer: ground, tile: water },
      { name: 'Sand', layer: ground, tile: sand },
      { name: 'Canopy', layer: cover, tile: canopy },
      { name: 'Arch', layer: cover, tile: arch },
    ],
  };
}
