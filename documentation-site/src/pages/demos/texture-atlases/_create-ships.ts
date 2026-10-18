import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSpriteAnimationComponent,
  AnimationClip,
} from '@forge-game-engine/forge/animations';
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import {
  addSpriteComponent,
  AtlasRegion,
  createAtlasSprite,
  createTextureAtlas,
  RenderContext,
} from '@forge-game-engine/forge/rendering';

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

// Where each vessel sits, and which of its kind's styles it starts on.
const vessels = [
  { kind: 'ship', x: -200, y: 120, angle: -0.4, firstStyle: 0 },
  { kind: 'ship', x: 40, y: 200, angle: 0.3, firstStyle: 2 },
  { kind: 'ship', x: 430, y: -60, angle: 1.2, firstStyle: 4 },
  { kind: 'dinghy', x: -330, y: 60, angle: 0.8, firstStyle: 0 },
  { kind: 'dinghy', x: 250, y: 150, angle: -0.6, firstStyle: 1 },
] as const;

const secondsPerStyle = 2;

/**
 * Builds an atlas of named ships and dinghies from texel rects copied out of
 * the sheet's packing data, and places sprites made from it. Each kind's
 * regions are also an animation clip, so every vessel changes style every
 * two seconds.
 * @param world - The world to add the ships to.
 * @param renderContext - The render context to load the ship sheet into.
 * @returns The registry holding the clips, for the sprite animation system.
 */
export async function createShips(
  world: EcsWorld,
  renderContext: RenderContext,
): Promise<AssetRegistry<AnimationClip>> {
  const texture = await renderContext.textureCache.getOrLoad(
    getAssetUrl(
      'img/kenney_pirate-pack/Spritesheet/shipsMiscellaneous_sheet.png',
    ),
  );
  const atlas = createTextureAtlas(texture, shipRects);

  // Every region whose name starts with the kind, in the atlas's order.
  const stylesOf = (kind: string): AtlasRegion[] =>
    atlas.regions.filter((region) => region.name.startsWith(kind));

  const clips = new AssetRegistry<AnimationClip>();
  const clipHandles = {
    ship: clips.register('ship', new AnimationClip(stylesOf('ship'))),
    dinghy: clips.register('dinghy', new AnimationClip(stylesOf('dinghy'))),
  };

  for (const { kind, x, y, angle, firstStyle } of vessels) {
    const styles = stylesOf(kind);
    const entity = world.createEntity();

    addPositionComponent(world, entity, { local: { x, y } });
    addRotationComponent(world, entity, { local: angle });
    addSpriteComponent(
      world,
      entity,
      createAtlasSprite(atlas, styles[firstStyle].name, { pixelsPerUnit: 1 }),
    );
    addSpriteAnimationComponent(world, entity, {
      animationClipHandle: clipHandles[kind],
      // The frame the animation shows next.
      animationFrameIndex: (firstStyle + 1) % styles.length,
      frameDurationMilliseconds: secondsPerStyle * 1000,
    });
  }

  return clips;
}
