import { Entity, System, World } from '@forge-game-engine/forge/ecs';
import {
  PositionComponent,
  RotationComponent,
  ScaleComponent,
  Time,
} from '@forge-game-engine/forge/common';
import { HoldAction } from '@forge-game-engine/forge/input';
import { degreesToRadians } from '@forge-game-engine/forge/math';
import { SpriteComponent } from '@forge-game-engine/forge/rendering';
import {
  LifetimeComponent,
  RemoveFromWorldStrategyComponent,
} from '@forge-game-engine/forge/lifecycle';
import { BulletComponent } from './_bullet.component';
import { GunComponent } from './_gun.component';
import { AudioComponent } from '../../../../../dist';
import { getAssetUrl } from '@site/src/utils/get-asset-url';

export class GunSystem extends System {
  private readonly _time: Time;
  private readonly _shootAction: HoldAction;
  private readonly _world: World;

  constructor(time: Time, shootAction: HoldAction, world: World) {
    super([GunComponent, PositionComponent], 'GunSystem');
    this._time = time;
    this._shootAction = shootAction;
    this._world = world;
  }

  public run(entity: Entity): void {
    if (!this._shootAction.isHeld) {
      return;
    }

    const gunComponent = entity.getComponentRequired(GunComponent);

    if (gunComponent.nextAllowedShotTime > this._time.timeInSeconds) {
      return;
    }

    const positionComponent = entity.getComponentRequired(PositionComponent);

    const bullet = this._world.buildAndAddEntity([
      new SpriteComponent(gunComponent.bulletSprite),
      new PositionComponent(
        positionComponent.world.x,
        positionComponent.world.y,
      ),
      new RotationComponent(degreesToRadians(270)),
      new ScaleComponent(0.2, 0.2),
      new BulletComponent(700),
      new LifetimeComponent(2),
      new RemoveFromWorldStrategyComponent(),
      new AudioComponent(
        {
          src: getAssetUrl('audio/laser.mp3'),
          volume: 0.3,
        },
        true,
      ),
    ]);

    gunComponent.renderLayer.addEntity(
      gunComponent.bulletSprite.renderable,
      bullet,
    );

    gunComponent.nextAllowedShotTime =
      this._time.timeInSeconds + gunComponent.timeBetweenShots;
  }
}
