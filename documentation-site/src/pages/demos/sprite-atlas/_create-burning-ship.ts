import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSpriteAnimationComponent,
  AnimationClip,
  createAtlasAnimationClip,
} from '@forge-game-engine/forge/animations';
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  createAtlasSprite,
  getAtlasRegionNames,
  SpriteEcsComponent,
  TextureAtlas,
} from '@forge-game-engine/forge/rendering';

export const burningShipPosition = { x: 60, y: 130 };

const pixelsPerUnit = 1;

// Where the flames and the blast sit on the ship, in the ship's frame, so
// they turn with it.
const flames = [
  { x: -12, y: -18, firstFrame: 0 },
  { x: 14, y: 30, firstFrame: 1 },
];
const blastPosition = { x: 18, y: -46 };

function addEffect(
  world: EcsWorld,
  ship: number,
  sprite: SpriteEcsComponent,
  animationClipHandle: number,
  position: Vector2,
  options: { firstFrame: number; frameDurationMilliseconds: number },
): void {
  const entity = world.createEntity();

  addPositionComponent(world, entity, { local: position });
  world.setParent(entity, ship);
  addSpriteComponent(world, entity, sprite);
  addSpriteAnimationComponent(world, entity, {
    animationClipHandle,
    animationFrameIndex: options.firstFrame,
    frameDurationMilliseconds: options.frameDurationMilliseconds,
  });
}

/**
 * Creates a ship on fire: two flames and a blast, each an animation of
 * trimmed atlas frames. The flames' frames are trimmed by different
 * amounts but share one untrimmed frame and a pivot at the flame's base,
 * so a flame stays planted on the deck as it changes frame.
 * @param world - The world to add the ship to.
 * @param atlas - The atlas to draw it from.
 * @param renderLayer - The category of the camera that draws it.
 * @returns The registry holding the clips, for the sprite animation system.
 */
export function createBurningShip(
  world: EcsWorld,
  atlas: TextureAtlas,
  renderLayer: number,
): AssetRegistry<AnimationClip> {
  // Every region whose name starts with the prefix, in natural order:
  // 'fire_1', 'fire_2', ...
  const fireFrames = getAtlasRegionNames(atlas, 'fire_');
  const blastFrames = getAtlasRegionNames(atlas, 'explosion_');

  const clips = new AssetRegistry<AnimationClip>();
  const fireClip = clips.register(
    'fire',
    createAtlasAnimationClip(atlas, fireFrames),
  );
  // The blast grows, then shrinks back before it repeats. A frame can
  // appear in a clip more than once.
  const blastClip = clips.register(
    'blast',
    createAtlasAnimationClip(atlas, [
      ...blastFrames,
      ...blastFrames.slice(1, -1).reverse(),
    ]),
  );

  const ship = world.createEntity();

  addPositionComponent(world, ship, { local: burningShipPosition });
  addRotationComponent(world, ship, { local: -0.5 });
  addSpriteComponent(world, ship, {
    ...createAtlasSprite(atlas, 'ship_2', { pixelsPerUnit }),
    category: renderLayer,
  });

  // A sprite takes its size and pivot from the region it's created from,
  // and keeps them while its animation changes frames, so it's created
  // from the clip's first frame.
  const fireSprite = {
    ...createAtlasSprite(atlas, fireFrames[0], { pixelsPerUnit }),
    category: renderLayer,
  };
  const blastSprite = {
    ...createAtlasSprite(atlas, blastFrames[0], { pixelsPerUnit }),
    category: renderLayer,
  };

  for (const { x, y, firstFrame } of flames) {
    addEffect(
      world,
      ship,
      fireSprite,
      fireClip,
      { x, y },
      {
        firstFrame,
        frameDurationMilliseconds: 160,
      },
    );
  }

  addEffect(world, ship, blastSprite, blastClip, blastPosition, {
    firstFrame: 0,
    frameDurationMilliseconds: 110,
  });

  return clips;
}
