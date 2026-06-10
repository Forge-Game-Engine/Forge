import { EcsWorld } from '@forge-game-engine/forge/ecs';
import { Sprite, spriteId } from '@forge-game-engine/forge/rendering';
import { positionId, rotationId } from '@forge-game-engine/forge/common';
import { Vector2 } from '@forge-game-engine/forge/math';

export function createEntity(world: EcsWorld, sprite: Sprite): void {
  const starEntity = world.createEntity();

  world.addComponent(starEntity, spriteId, sprite);

  world.addComponent(starEntity, positionId, {
    local: new Vector2(0, 0),
    world: new Vector2(0, 0),
  });

  world.addComponent(starEntity, rotationId, {
    local: Math.PI,
    world: Math.PI,
  });
}
