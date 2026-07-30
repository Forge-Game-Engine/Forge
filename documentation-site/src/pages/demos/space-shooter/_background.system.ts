import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { backgroundId } from './_background.component';

export const createBackgroundEcsSystem = (
  time: Time,
): EcsSystem<[SpriteEcsComponent]> => ({
  query: [spriteId],
  tags: [backgroundId],
  update: (_world, { components: [spriteComponents] }) => {
    for (const spriteComponent of spriteComponents) {
      spriteComponent.renderable.material.setUniform(
        'u_time',
        time.timeInSeconds,
      );
    }
  },
});
