import { Time } from '@forge-game-engine/forge/common';
import { EcsSystem } from '@forge-game-engine/forge/ecs';
import { TextEcsComponent, textId } from '@forge-game-engine/forge/text';
import { CounterEcsComponent, counterId } from './_counter.component';

const tickIntervalSeconds = 1;

/**
 * Increments every `CounterEcsComponent` entity's count once per second,
 * writing the new value directly into its `TextEcsComponent.text`. This is
 * what demonstrates `createTextShapingEcsSystem`'s dirty tracking: only the
 * counter label's glyphs are re-shaped each tick this changes its text, the
 * heading and subheading (whose `text` never changes) are shaped once and
 * never again.
 * @param time - The time instance used to derive elapsed seconds.
 * @returns The counter ECS system.
 */
export const createCounterEcsSystem = (
  time: Time,
): EcsSystem<[CounterEcsComponent, TextEcsComponent]> => ({
  query: [counterId, textId],
  update: (_world, { components: [counters, texts] }) => {
    for (let i = 0; i < counters.length; i++) {
      const counter = counters[i];
      const textComponent = texts[i];

      counter.secondsSinceLastTick += time.deltaTimeInSeconds;

      if (counter.secondsSinceLastTick < tickIntervalSeconds) {
        continue;
      }

      counter.secondsSinceLastTick -= tickIntervalSeconds;
      counter.count++;
      textComponent.text = `Count: ${counter.count}`;
    }
  },
});
