import { Howl } from 'howler';
import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  PositionEcsComponent,
  positionId,
  rotationId,
  scaleId,
  Time,
} from '@forge-game-engine/forge/common';
import { HoldAction } from '@forge-game-engine/forge/input';
import { degreesToRadians, Vector2 } from '@forge-game-engine/forge/math';
import { spriteId } from '@forge-game-engine/forge/rendering';
import {
  lifetimeId,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';
import { audioId } from '@forge-game-engine/forge/audio';
import {
  CircleShape,
  PhysicsBodyId,
  RigidBody,
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
    run: (result) => {
      const [gunComponent, positionComponent] = result.components;

      if (!shootAction.isHeld) {
        return;
      }

      if (gunComponent.nextAllowedShotTime > time.timeInSeconds) {
        return;
      }

      createBulletWithOffset(
        world,
        gunComponent,
        positionComponent,
        new Vector2(20, 20),
        sound,
      );
      createBulletWithOffset(
        world,
        gunComponent,
        positionComponent,
        new Vector2(-20, 20),
        sound,
      );

      gunComponent.nextAllowedShotTime =
        time.timeInSeconds + gunComponent.timeBetweenShots;
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
  const spawnPosition = positionComponent.world.add(offset);

  world.addComponent(bullet, spriteId, gunComponent.bulletSprite);

  world.addComponent(bullet, positionId, {
    local: spawnPosition,
    world: positionComponent.world.add(offset),
  });

  world.addComponent(bullet, rotationId, {
    local: degreesToRadians(270),
    world: degreesToRadians(270),
  });

  world.addComponent(bullet, scaleId, {
    local: new Vector2(bulletScale, bulletScale),
    world: new Vector2(bulletScale, bulletScale),
  });

  world.addComponent(bullet, bulletId, {
    speed: 800,
  });

  world.addComponent(bullet, lifetimeId, {
    durationSeconds: 2,
    elapsedSeconds: 0,
    hasExpired: false,
  });

  world.addTag(bullet, RemoveFromWorldLifetimeStrategyId);

  world.addComponent(bullet, audioId, {
    playSound: true,
    sound,
  });

  const bulletRadius =
    (gunComponent.bulletSprite.width * bulletScale +
      gunComponent.bulletSprite.height * bulletScale) /
    4;

  world.addComponent(bullet, PhysicsBodyId, {
    physicsBody: new RigidBody({
      shape: new CircleShape(bulletRadius),
      position: new Vector2(spawnPosition.x, spawnPosition.y),
      isStatic: false,
      isSensor: true,
    }),
    isKinematic: true,
  });
}
