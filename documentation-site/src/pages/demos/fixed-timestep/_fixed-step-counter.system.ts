import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  FixedStepCounterEcsComponent,
  fixedStepCounterId,
} from './_fixed-step-counter.component';

/**
 * Creates a system that counts the fixed steps of each frame. Register it in
 * the fixed-update group, so it runs once per fixed step: the first step of
 * a frame starts the count again from `0`.
 * @param time - The time the world's fixed steps are taken from.
 * @returns The ECS system.
 */
export const createFixedStepCounterEcsSystem = (
  time: Time,
): EcsSystem<[FixedStepCounterEcsComponent]> => ({
  query: [fixedStepCounterId],
  update: (_world, { components: [counters] }) => {
    for (const counter of counters) {
      if (counter.frame !== time.frames) {
        counter.frame = time.frames;
        counter.steps = 0;
      }

      counter.steps++;
    }
  },
});
