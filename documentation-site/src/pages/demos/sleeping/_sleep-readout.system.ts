import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  CollisionPair,
  findSleepingManifolds,
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { textId } from '@forge-game-engine/forge/text';
import {
  SleepReadoutEcsComponent,
  sleepReadoutId,
} from './_sleep-readout.component';

/**
 * Creates the system that writes the readout: how many dynamic bodies are
 * asleep, how many pairs the broad phase found on the latest step, and how
 * many of those the narrow phase would test now. The broad phase keeps
 * pairing sleeping bodies whose bounds overlap; what sleeping saves is the
 * narrow phase's tests and the solver's work. A pair isn't tested when
 * `findSleepingManifolds` returns the contact a sleeping body recorded for
 * it. The demo has no sensors, which the narrow phase always tests.
 *
 * Register it in the default group, after the fixed steps, so it reads the
 * latest step's pairs. It runs after the explosion and trapdoor systems, so
 * on a frame where one of them wakes a body the tested count already
 * includes that body's pairs.
 * @param collisionPairs - The broad phase's output, which this only reads.
 * @returns The ECS system.
 */
export const createSleepReadoutEcsSystem = (
  collisionPairs: readonly CollisionPair[],
): EcsSystem<[SleepReadoutEcsComponent]> => ({
  query: [sleepReadoutId],
  update: (world, { components: [readouts] }) => {
    const {
      components: [bodies],
    } = world.query<[RigidBodyEcsComponent]>([rigidBodyId]);

    const dynamicBodies = bodies.filter((body) => body.type === 'dynamic');
    const asleep = dynamicBodies.filter((body) => body.isSleeping).length;
    const tested = collisionPairs.filter(
      ({ entityA, entityB }) =>
        findSleepingManifolds(world, entityA, entityB) === null,
    ).length;

    const lines = [
      `Bodies asleep: ${asleep} / ${dynamicBodies.length}`,
      `Broad-phase pairs: ${collisionPairs.length}`,
      `Pairs the narrow phase tests: ${tested}`,
    ];

    for (const { labels } of readouts) {
      for (let i = 0; i < labels.length; i++) {
        // The text shaping system only re-shapes text that changed, so
        // writing the same line every frame costs nothing.
        world.getComponentRequired(labels[i], textId).text = lines[i];
      }
    }
  },
});
