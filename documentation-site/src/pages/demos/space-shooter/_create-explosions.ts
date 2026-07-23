import { Howl } from 'howler';
import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addSpriteAnimationComponent,
  AnimationClip,
  createSpriteSheet,
  selectAnimationFrames,
} from '@forge-game-engine/forge/animations';
import { AssetRegistry } from '@forge-game-engine/forge/asset-loading';
import { addAudioComponent } from '@forge-game-engine/forge/audio';
import {
  addPositionComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import {
  addLifetimeComponent,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';
import { Vector2 } from '@forge-game-engine/forge/math';
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

// explosion.mp3 runs ~5.5s, much longer than the sprite animation, so its
// playback is tracked on its own entity instead of the short-lived visual one.
const explosionSoundDurationSeconds = 6;

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
): Promise<ExplosionSpawner> {
  const image = await renderContext.imageCache.getOrLoad(
    getAssetUrl('img/space-shooter/Effect_Explosion_1_517x517.png'),
  );

  const explosionSprite = createImageSprite(image, renderContext, renderLayer, {
    frameDimensions: new Vector2(
      image.width / explosionColumns,
      image.height / explosionRows,
    ),
  });

  const spriteSheet = createSpriteSheet(image, explosionRows, explosionColumns);

  explosionSprite.uvScale = spriteSheet.frames[0][0].dimensions.clone();

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
        uvOffset: new Vector2(0, 0),
      });

      addPositionComponent(world, explosionEntity, {
        local: position.clone(),
        world: position.clone(),
      });

      addScaleComponent(world, explosionEntity, {
        local: new Vector2(explosionScale, explosionScale),
        world: new Vector2(explosionScale, explosionScale),
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

      const explosionSoundEntity = world.createEntity();

      addAudioComponent(world, explosionSoundEntity, {
        sound: new Howl({
          src: getAssetUrl('audio/explosion.mp3'),
          volume: 0.6,
        }),
        playSound: true,
      });

      addLifetimeComponent(world, explosionSoundEntity, {
        durationSeconds: explosionSoundDurationSeconds,
      });

      world.addTag(explosionSoundEntity, RemoveFromWorldLifetimeStrategyId);
    },
  };
}
