import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { Time } from '@forge-game-engine/forge/common';
import { TextEcsComponent, textId } from '@forge-game-engine/forge/text';
import { elapsedCounterTag } from './_elapsed-counter.component';

/**
 * Creates a system that updates every entity tagged `elapsedCounterTag`'s
 * text with the demo's elapsed time, once per frame.
 * @param time - The time instance used to read elapsed seconds.
 * @returns The ECS system.
 */
export const createElapsedCounterEcsSystem = (
  time: Time,
): EcsSystem<[TextEcsComponent]> => ({
  query: [textId],
  tags: [elapsedCounterTag],
  update: (_world, { components: [texts] }) => {
    for (const text of texts) {
      text.text = `Elapsed: ${time.timeInSeconds.toFixed(1)}s`;
    }
  },
});
