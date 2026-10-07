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
  sfxBus: MixerBus,
  explosionSound: SoundAsset,
): Promise<ExplosionSpawner> {
  const texture = await renderContext.textureCache.getOrLoad(
    getAssetUrl('img/space-shooter/Effect_Explosion_1_517x517.png'),
  );

  const explosionSprite = {
    ...createImageSprite(texture, {
      pixelsPerUnit: 1,
      frameDimensions: {
        x: texture.width / explosionColumns,
        y: texture.height / explosionRows,
      },
    }),
    category: renderLayer,
  };

  const spriteSheet = createSpriteSheet(
    texture,
    explosionRows,
    explosionColumns,
  );

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

      addSpriteComponent(world, explosionEntity, explosionSprite);

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

      // The sound outlasts the sprite animation, and needs no entity of its
      // own: it plays to its end on the sfx bus.
      playSound(sfxBus, explosionSound, { volume: 0.6 });
    },
  };
}
