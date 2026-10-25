import {
  createSystemGroup,
  EcsSystemGroup,
} from '../../ecs/ecs-system-group.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { Time } from './Time.js';

// Each fixed step a `Time` holds can be taken only once, so a second group
// repeating on the same `Time` would always find the steps already taken and
// silently run zero times. Weakly held, so a finished `Time` is collected.
const timesWithFixedUpdate = new WeakSet<Time>();

/**
 * Registers a system group that runs once per fixed step of `time`, and
 * returns it. Register fixed-rate systems in it with `addSystem`'s `group`
 * option. Systems in it read the fixed clock from `time`:
 * `deltaTimeInSeconds` is the fixed delta and `isInFixedStep` is `true`.
 *
 * The group, named `fixed-update`, runs after the world's start-of-tick
 * groups (game-state transitions, `registerInputs`' input update) and before
 * `world.defaultSystemGroup`, so the default group's systems run once the
 * frame's fixed steps are done and read the variable delta and
 * `fixedOverstepFraction`. It repeats while `time.consumeFixedStep()`
 * returns `true`: zero times on a frame shorter than the fixed delta, and
 * several times on a longer one.
 *
 * Another group ordered only `before: [world.defaultSystemGroup]` isn't
 * ordered against this one, so it runs before or after the fixed steps
 * depending on which was registered first. Order it against the returned
 * group (`before` or `after`) to fix its place.
 *
 * Call it once per `Time`: each fixed step `time` holds is taken by one
 * group, so only one world of a `Game` (which updates one `Time` for all its
 * worlds) can run fixed steps.
 * @param world - The world to register the group in.
 * @param time - The time whose fixed steps the group runs. It must be
 * updated before `world` is, as `Game` does.
 * @returns The fixed-update group.
 * @throws An error if a fixed-update group was already registered with
 * `time`, in this world or another.
 */
export const registerFixedUpdate = (
  world: EcsWorld,
  time: Time,
): EcsSystemGroup => {
  if (timesWithFixedUpdate.has(time)) {
    throw new Error(
      'Unable to register a fixed-update group with this Time, a fixed-update group registered with it already takes its fixed steps. Only one fixed-update group per Time (one world per Game) can run fixed steps: register fixed-rate systems in the group the first registerFixedUpdate call returned.',
    );
  }

  const fixedUpdateGroup = createSystemGroup('fixed-update');

  world.addSystemGroup(fixedUpdateGroup, {
    before: [world.defaultSystemGroup],
    runWhile: () => time.consumeFixedStep(),
  });

  timesWithFixedUpdate.add(time);

  return fixedUpdateGroup;
};
