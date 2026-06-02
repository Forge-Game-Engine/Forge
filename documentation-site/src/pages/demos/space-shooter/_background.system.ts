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
  query: [spriteId, backgroundId],
  run: (result) => {
    const [spriteComponent] = result.components;

    spriteComponent.sprite.renderable.material.setUniform(
      'u_time',
      time.timeInSeconds,
    );
  },
});
