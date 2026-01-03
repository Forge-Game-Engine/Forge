import { getAssetUrl } from '@site/src/utils/get-asset-url';
import { Entity, World } from '@forge-game-engine/forge/ecs';
import {
  Color,
  createImageSprite,
  RenderContext,
  RenderLayer,
  SpriteComponent,
} from '@forge-game-engine/forge/rendering';
import { PositionComponent, RotationComponent, ScaleComponent } from '@forge-game-engine/forge/common';
import { PlayerComponent } from './_player.component';
import { GunComponent } from './_gun.component';
import { degreesToRadians } from '../../../../../dist';

export async function createPlayer(
  renderContext: RenderContext,
  cameraEntity: Entity,
  world: World,
  renderLayer: RenderLayer,
): Promise<Entity> {
  const playerSprite = await createImageSprite(
    getAssetUrl('img/space-shooter/Spaceship_6.png'),
    renderContext,
    cameraEntity,
  );

  const bulletSprite = await createImageSprite(
    getAssetUrl('img/space-shooter/bullet-yellow.png'),
    renderContext,
    cameraEntity,
  );

  const playerEntity = world.buildAndAddEntity([
    new SpriteComponent(playerSprite),
    new PositionComponent(0, 250),
    new PlayerComponent(50, -300, 300, -100, 270),
    new ScaleComponent(0.15, 0.15),
    new RotationComponent(degreesToRadians(180)),
    new GunComponent(0.2, bulletSprite, renderLayer),
  ]);

  renderLayer.addEntity(playerSprite.renderable, playerEntity);

  return playerEntity;
}
