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
import {
  addSpriteComponent,
  addTrailComponent,
  Color,
} from '@forge-game-engine/forge/rendering';
import {
  addLifetimeComponent,
  RemoveFromWorldLifetimeStrategyId,
} from '@forge-game-engine/forge/lifecycle';
import {
  MixerBus,
  playSound,
  SoundAsset,
} from '@forge-game-engine/forge/audio';
import {
  addColliderComponent,
  CircleCollider,
} from '@forge-game-engine/forge/physics';
import { bulletId } from './_bullet.component';
import { asteroidCategory, bulletCategory } from './_collision-categories';
import { GunEcsComponent, gunId } from './_gun.component';

// The bullet's streak: as wide as the bright core of its sprite, tapering
// and fading behind it. Its colors are brighter than white, like the
// bullet's emissive color, so the foreground camera's bloom makes it glow.
const bulletTrailOptions = {
  lifetimeSeconds: 0.12,
  minVertexDistance: 8,
  startWidth: 5,
  endWidth: 0,
  startColor: new Color(2, 1.3, 0.3, 1),
  endColor: new Color(2, 0.4, 0.05, 0),
};

export const createGunEcsSystem = (
  time: Time,
  world: EcsWorld,
  shootAction: HoldAction,
  sfxBus: MixerBus,
  laserSound: SoundAsset,
): EcsSystem<[GunEcsComponent, PositionEcsComponent]> => {
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

        createBulletWithOffset(world, gunComponent, positionComponent, {
          x: 20,
          y: -20,
        });
        createBulletWithOffset(world, gunComponent, positionComponent, {
          x: -20,
          y: -20,
        });

        // One sound per volley; both bullets fire together.
        playSound(sfxBus, laserSound, { volume: 0.4 });

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
) {
  const bullet = world.createEntity();
  const bulletScale = 0.15;
  // clone: positionComponent.local is the gun owner's own live position
  // field, must not be mutated by adding the muzzle offset into it.
  const spawnPosition = Vec2.add(Vec2.clone(positionComponent.local), offset);

  addSpriteComponent(world, bullet, gunComponent.bulletSprite);

  addPositionComponent(world, bullet, {
    local: spawnPosition,
  });

  addRotationComponent(world, bullet, {
    local: degreesToRadians(-90),
  });

  addScaleComponent(world, bullet, {
    local: { x: bulletScale, y: bulletScale },
  });

  // The trail draws behind the bullet's sprite, on the camera that draws the
  // bullet. Removing the bullet removes its trail too.
  addTrailComponent(world, bullet, {
    ...bulletTrailOptions,
    category: gunComponent.renderLayer,
  });

  world.addComponent(bullet, bulletId, {
    speed: 800,
  });

  addLifetimeComponent(world, bullet, {
    durationSeconds: 2,
  });

  world.addTag(bullet, RemoveFromWorldLifetimeStrategyId);

  const bulletRadius =
    (gunComponent.bulletSprite.width * bulletScale +
      gunComponent.bulletSprite.height * bulletScale) /
    4;

  addColliderComponent(world, bullet, {
    collider: new CircleCollider(bulletRadius),
    category: bulletCategory,
    mask: asteroidCategory,
  });
}
