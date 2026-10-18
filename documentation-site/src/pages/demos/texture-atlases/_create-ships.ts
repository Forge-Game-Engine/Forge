import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import {
  addSpriteComponent,
  createAtlasSprite,
  createTextureAtlas,
  RenderContext,
} from '@forge-game-engine/forge/rendering';
import { addShipStyleComponent } from './_ship-style.component';

// A few named images from the sheet's packing data
// (shipsMiscellaneous_sheet.xml), as texel rects from its top-left corner.
const shipRects = [
  { name: 'ship (1)', x: 408, y: 0, width: 66, height: 113 },
  { name: 'ship (2)', x: 408, y: 115, width: 66, height: 113 },
  { name: 'ship (3)', x: 204, y: 115, width: 66, height: 113 },
  { name: 'ship (4)', x: 68, y: 192, width: 66, height: 113 },
  { name: 'ship (5)', x: 68, y: 77, width: 66, height: 113 },
  { name: 'ship (6)', x: 68, y: 307, width: 66, height: 113 },
  { name: 'dinghyLarge1', x: 606, y: 145, width: 20, height: 38 },
  { name: 'dinghyLarge2', x: 610, y: 426, width: 20, height: 38 },
  { name: 'dinghyLarge3', x: 588, y: 426, width: 20, height: 38 },
];

const ships = [
  { x: -200, y: 120, angle: -0.4, phaseSeconds: 0 },
  { x: 40, y: 200, angle: 0.3, phaseSeconds: 0.5 },
  { x: 430, y: -60, angle: 1.2, phaseSeconds: 1 },
];

const dinghies = [
  { x: -330, y: 60, angle: 0.8, phaseSeconds: 0.25 },
  { x: 250, y: 150, angle: -0.6, phaseSeconds: 0.75 },
];

/**
 * Builds an atlas of named ships and dinghies from texel rects copied out of
 * the sheet's packing data, and places sprites made from it by name. Each
 * one cycles through the other regions of its kind.
 * @param world - The world to add the ships to.
 * @param renderContext - The render context to load the ship sheet into.
 */
export async function createShips(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<void> {
  const texture = await renderContext.textureCache.getOrLoad(
    getAssetUrl(
      'img/kenney_pirate-pack/Spritesheet/shipsMiscellaneous_sheet.png',
    ),
  );
  const atlas = createTextureAtlas(texture, shipRects);
  const shipStyles = atlas.regions.filter((region) =>
    region.name.startsWith('ship'),
  );
  const dinghyStyles = atlas.regions.filter((region) =>
    region.name.startsWith('dinghy'),
  );

  for (const { x, y, angle, phaseSeconds } of ships) {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x, y } });
    addRotationComponent(world, entity, { local: angle });
    addSpriteComponent(
      world,
      entity,
      createAtlasSprite(atlas, 'ship (1)', { pixelsPerUnit: 1 }),
    );
    addShipStyleComponent(world, entity, shipStyles, phaseSeconds);
  }

  for (const { x, y, angle, phaseSeconds } of dinghies) {
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x, y } });
    addRotationComponent(world, entity, { local: angle });
    addSpriteComponent(
      world,
      entity,
      createAtlasSprite(atlas, 'dinghyLarge1', { pixelsPerUnit: 1 }),
    );
    addShipStyleComponent(world, entity, dinghyStyles, phaseSeconds);
  }
}
