import { Howl } from 'howler';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
  PositionEcsComponent,
  positionId,
  Time,
} from '@forge-game-engine/forge/common';
import { HoldAction } from '@forge-game-engine/forge/input';
import { degreesToRadians, Vec2, Vector2 } from '@forge-game-engine/forge/math';
import { addSpriteComponent } from '@forge-game-engine/forge/rendering';
import {
  addLifetimeComponent,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';
import { addAudioComponent } from '@forge-game-engine/forge/audio';
import {
  addAabbComponent,
  addColliderComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';
import { bulletId } from './_bullet.component';
import { GunEcsComponent, gunId } from './_gun.component';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export const createGunEcsSystem = (
  time: Time,
  world: EcsWorld,
  shootAction: HoldAction,
): EcsSystem<[GunEcsComponent, PositionEcsComponent]> => {
  // Created per system instance (rather than at module scope) so each game
  // restart gets its own Howl, since the audio system unloads any sound
  // still playing when the world stops.
  const sound = new Howl({
    src: getAssetUrl('audio/laser.mp3'),
    volume: 0.2,
  });

  return {
    query: [gunId, positionId],
    update: (_world, { components: [gunComponents, positionComponents] }) => {
      for (let i = 0; i < gunComponents.length; i++) {
        const gunComponent = gunComponents[i];
        const positionComponent = positionComponents[i];

        if (!shootAction.isHeld) {
          continue;
        }

        if (gunComponent.nextAllowedShotTime > time.timeInSeconds) {
          continue;
        }

        createBulletWithOffset(
          world,
          gunComponent,
          positionComponent,
          Vec2.create(20, 20),
          sound,
        );
        createBulletWithOffset(
          world,
          gunComponent,
          positionComponent,
          Vec2.create(-20, 20),
          sound,
        );

        gunComponent.nextAllowedShotTime =
          time.timeInSeconds + gunComponent.timeBetweenShots;
      }
    },
  };
};

function createBulletWithOffset(
  world: EcsWorld,
  gunComponent: GunEcsComponent,
  positionComponent: PositionEcsComponent,
  offset: Vector2,
  sound: Howl,
) {
  const bullet = world.createEntity();
  const bulletScale = 0.15;
  // clone: positionComponent.world is the gun owner's own live position
  // field, must not be mutated by adding the muzzle offset into it.
  const spawnPosition = Vec2.add(Vec2.clone(positionComponent.world), offset);

  addSpriteComponent(world, bullet, gunComponent.bulletSprite);

  addPositionComponent(world, bullet, {
    local: spawnPosition,
    world: Vec2.clone(spawnPosition),
  });

  addRotationComponent(world, bullet, {
    local: degreesToRadians(270),
    world: degreesToRadians(270),
  });

  addScaleComponent(world, bullet, {
    local: Vec2.create(bulletScale, bulletScale),
    world: Vec2.create(bulletScale, bulletScale),
  });

  world.addComponent(bullet, bulletId, {
    speed: 800,
  });

  addLifetimeComponent(world, bullet, {
    durationSeconds: 2,
  });

  world.addTag(bullet, RemoveFromWorldLifetimeStrategyId);

  addAudioComponent(world, bullet, {
    playSound: true,
    sound,
  });

  const bulletRadius =
    (gunComponent.bulletSprite.width * bulletScale +
      gunComponent.bulletSprite.height * bulletScale) /
    4;

  addColliderComponent(world, bullet, {
    collider: new CircleCollider(bulletRadius),
  });
  addAabbComponent(world, bullet);
}
