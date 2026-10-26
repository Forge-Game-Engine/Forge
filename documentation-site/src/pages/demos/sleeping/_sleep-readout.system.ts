import { EcsSystem, EcsWorld } from '@forge-game-engine/forge/ecs';
import {
  CollisionPair,
  isBodyAwake,
  RigidBodyEcsComponent,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import { textId } from '@forge-game-engine/forge/text';
import {
  SleepReadoutEcsComponent,
  sleepReadoutId,
} from './_sleep-readout.component';

const isSleepingBody = (body: RigidBodyEcsComponent | null): boolean =>
  body !== null && body.type === 'dynamic' && body.isSleeping;

/** Whether `body` recorded a contact for `pair` when it fell asleep. */
const hasRecordedContact = (
  body: RigidBodyEcsComponent | null,
  { entityA, entityB }: CollisionPair,
): boolean =>
  body?.sleepRecord?.manifolds.some(
    (manifold) => manifold.entityA === entityA && manifold.entityB === entityB,
  ) ?? false;

/**
 * Whether the narrow phase tests a broad-phase pair. It skips a pair, and
 * reuses the contact a sleeping body recorded when it fell asleep, when
 * neither entity is awake, at least one of them is a sleeping body, and one
 * of their sleep records has a contact for the pair. Nothing in a sleeping
 * island has moved since, so the old contact is still right.
 */
const isPairTested = (world: EcsWorld, pair: CollisionPair): boolean => {
  const bodyA = world.getComponent(pair.entityA, rigidBodyId);
  const bodyB = world.getComponent(pair.entityB, rigidBodyId);

  const isSkipped =
    (isSleepingBody(bodyA) || isSleepingBody(bodyB)) &&
    !isBodyAwake(world, pair.entityA) &&
    !isBodyAwake(world, pair.entityB) &&
    (hasRecordedContact(bodyA, pair) || hasRecordedContact(bodyB, pair));

  return !isSkipped;
};

/**
 * Creates the system that writes the readout: how many dynamic bodies are
 * asleep, how many pairs the broad phase found on the latest step, and how
 * many of those the narrow phase tested. The broad phase keeps pairing
 * sleeping bodies whose bounds overlap; what sleeping saves is the narrow
 * phase's tests and the solver's work.
 *
 * Register it in the default group, after the fixed steps, so it reads the
 * latest step's pairs.
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
    const tested = collisionPairs.filter((pair) =>
      isPairTested(world, pair),
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
