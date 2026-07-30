import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { brickId } from './_brick.component';

export const createBrickEcsSystem = (
  time: Time,
): EcsSystem<[SpriteEcsComponent]> => ({
  query: [spriteId],
  tags: [brickId],
  update: (_world, { components: [spriteComponents] }) => {
    for (const spriteComponent of spriteComponents) {
      spriteComponent.renderable.material.setUniform(
        'u_time',
        time.timeInSeconds,
      );
    }
  },
});
