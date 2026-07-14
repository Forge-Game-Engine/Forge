import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import {
  SpriteEcsComponent,
  spriteId,
} from '@forge-game-engine/forge/rendering';
import { erosionId } from './_erosion.component';

const cycleDurationSeconds = 6;
const cycleSpeed = (2 * Math.PI) / cycleDurationSeconds;

// The burn line travels beyond [0, 1] and back, so the sprite fully reforms and
// fully disappears with a brief hold at each end, rather than snapping the
// instant it touches the limit.
const burnRange = 1.3;
const burnOffset = -0.15;

export const createErosionEcsSystem = (
  time: Time,
): EcsSystem<[SpriteEcsComponent]> => ({
  query: [spriteId],
  tags: [erosionId],
  run: (result) => {
    const [sprite] = result.components;

    const wave = (Math.sin(time.timeInSeconds * cycleSpeed) + 1) / 2;

    sprite.renderable.material.setUniform(
      'u_burnProgress',
      wave * burnRange + burnOffset,
    );
  },
});
