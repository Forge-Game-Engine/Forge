import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { addSpriteComponent, Sprite } from '@forge-game-engine/forge/rendering';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';
import { createVector2 } from '../../../../../dist';

export function createEntity(
  world: EcsWorld,
  sprite: Sprite,
  xPosition: number,
): void {
  const entity = world.createEntity();

  addSpriteComponent(world, entity, sprite);

  addPositionComponent(world, entity, {
    world: createVector2(xPosition, 0),
  });
  addScaleComponent(world, entity, {
    world: createVector2(4.5, 4.5),
  });

  addRotationComponent(world, entity, {
    local: Math.PI,
    world: Math.PI,
  });
}
