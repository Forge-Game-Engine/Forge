import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSpriteAnimationComponent,
  AnimationClip,
  createSpriteSheet,
  selectAnimationFrames,
} from '@forge-game-engine/forge/animations';
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import {
  MixerBus,
  playSound,
  SoundAsset,
} from '@forge-game-engine/forge/audio';
import {
  addPositionComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import {
  addLifetimeComponent,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';
import { Vec2, Vector2 } from '@forge-game-engine/forge/math';
import {
  addSpriteComponent,
  createImageSprite,
  RenderContext,
} from '@forge-game-engine/forge/rendering';

const explosionRows = 5;
const explosionColumns = 6;
const explosionStartFrame = 1;
const explosionFrameCount = 26;
const explosionFrameDurationMilliseconds = 20;
const explosionScale = 0.4;

export interface ExplosionSpawner {
  animationRegistry: AssetRegistry<AnimationClip>;
  spawn: (
    world: EcsWorld,
    position: Vector2,
    currentTimeInSeconds: number,
  ) => void;
}

export async function createExplosionSpawner(
  renderContext: RenderContext,
  renderLayer: number,
  triggerCameraShake: () => void,
  explosionSound: SoundAsset,
  sfxBus: MixerBus,
): Promise<ExplosionSpawner> {
  const image = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/space-shooter/Effect_Explosion_1_517x517.png'),
  );

  const explosionSprite = createImageSprite(image, renderContext, {
    pixelsPerUnit: 1,
    layer: renderLayer,
    frameDimensions: {
      x: image.width / explosionColumns,
      y: image.height / explosionRows,
    },
  });

  const spriteSheet = createSpriteSheet(image, explosionRows, explosionColumns);

  // clone: the frame's own dimensions object is shared spritesheet data, not
  // disposable to hand off as the sprite's live uvScale.
  explosionSprite.uvScale = Vec2.clone(spriteSheet.frames[0][0].dimensions);

  const animationClip = new AnimationClip(
    selectAnimationFrames(
      spriteSheet,
      explosionFrameCount,
      explosionStartFrame,
    ),
  );

  const animationRegistry = new AssetRegistry<AnimationClip>();
  const animationClipHandle = animationRegistry.register(
    'explosion',
    animationClip,
  );

  return {
    animationRegistry,
    spawn: (world, position, currentTimeInSeconds) => {
      triggerCameraShake();

      const explosionEntity = world.createEntity();

      addSpriteComponent(world, explosionEntity, {
        ...explosionSprite,
        uvOffset: { x: 0, y: 0 },
      });

      addPositionComponent(world, explosionEntity, {
        local: Vec2.clone(position),
      });

      addScaleComponent(world, explosionEntity, {
        local: { x: explosionScale, y: explosionScale },
      });

      addSpriteAnimationComponent(world, explosionEntity, {
        frameDurationMilliseconds: explosionFrameDurationMilliseconds,
        lastFrameChangeTimeInSeconds: currentTimeInSeconds,
        animationClipHandle,
      });

      addLifetimeComponent(world, explosionEntity, {
        durationSeconds:
          (explosionFrameCount * explosionFrameDurationMilliseconds) / 1000,
      });

      world.addTag(explosionEntity, RemoveFromWorldLifetimeStrategyId);

      // The sound outlasts the sprite animation, so it's played on its own
      // rather than tied to the explosion entity.
      playSound(sfxBus, explosionSound, { volume: 0.6 });
    },
  };
}
