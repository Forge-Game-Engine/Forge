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
import { bulletId } from './_bullet.component';
import { GunEcsComponent, gunId } from './_gun.component';
import { audioId } from '../../../../../dist';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export const createGunEcsSystem = (
  time: Time,
  world: EcsWorld,
  shootAction: HoldAction,
): EcsSystem<[GunEcsComponent, PositionEcsComponent]> => ({
  query: [gunId, positionId],
  run: (result) => {
    const [gunComponent, positionComponent] = result.components;

    if (!shootAction.isHeld) {
      return;
    }

    if (gunComponent.nextAllowedShotTime > time.timeInSeconds) {
      return;
    }

    const bullet = world.createEntity();

    world.addComponent(bullet, spriteId, {
      sprite: gunComponent.bulletSprite,
      enabled: true,
    });

    world.addComponent(bullet, positionId, {
      local: positionComponent.world.clone(),
      world: positionComponent.world.clone(),
    });

    world.addComponent(bullet, rotationId, {
      local: degreesToRadians(270),
      world: degreesToRadians(270),
    });

    world.addComponent(bullet, scaleId, {
      local: new Vector2(0.2, 0.2),
      world: new Vector2(0.2, 0.2),
    });

    world.addComponent(bullet, bulletId, {
      speed: 700,
    });

    world.addComponent(bullet, lifetimeId, {
      durationSeconds: 2,
      elapsedSeconds: 0,
      hasExpired: false,
    });

    world.addTag(bullet, RemoveFromWorldLifetimeStrategyId);

    world.addComponent(bullet, audioId, {
      playSound: true,
      sound: new Howl({
        src: getAssetUrl('audio/laser.mp3'),
        volume: 0.3,
      }),
    });

    gunComponent.nextAllowedShotTime =
      time.timeInSeconds + gunComponent.timeBetweenShots;
  },
});
