import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { addSpriteComponent, Sprite } from '@forge-game-engine/forge/rendering';
import {
  addPositionComponent,
  addRotationComponent,
  addScaleComponent,
} from '@forge-game-engine/forge/common';


export function createEntity(
  world: EcsWorld,
  sprite: Sprite,
  xPosition: number,
): void {
  const entity = world.createEntity();

  addSpriteComponent(world, entity, sprite);

  addPositionComponent(world, entity, {
    world: { x: xPosition, y: 0 },
  });
  addScaleComponent(world, entity, {
    world: { x: 4.5, y: 4.5 },
  });

  addRotationComponent(world, entity, {
    local: Math.PI,
    world: Math.PI,
  });
}
