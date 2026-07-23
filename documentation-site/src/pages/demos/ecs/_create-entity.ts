import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { addSpriteComponent, Sprite } from '@forge-game-engine/forge/rendering';
import {
  addPositionComponent,
  addRotationComponent,
} from '@forge-game-engine/forge/common';

export function createEntity(world: EcsWorld, sprite: Sprite): void {
  const starEntity = world.createEntity();

  addSpriteComponent(world, starEntity, sprite);

  addPositionComponent(world, starEntity);

  addRotationComponent(world, starEntity, {
    local: Math.PI,
    world: Math.PI,
  });
}
