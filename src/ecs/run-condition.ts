import type { EcsWorld } from './ecs-world.js';

/**
 * Decides whether a system or system group runs. Pass one as `runIf` to
 * `EcsWorld.addSystem` or `EcsWorld.addSystemGroup`, and the world calls it
 * each tick just before the system or group would run. Pass one as
 * `runWhile` to `EcsWorld.addSystemGroup`, and the world calls it before
 * each run of the group, running the group again while it returns `true`.
 *
 * A `runIf` condition only reads state. A `runWhile` condition may also
 * advance the state it loops over (taking a fixed step, popping a queue),
 * since that's what ends the loop. Neither decides which entities a system
 * matches: the system's `query` and `tags` stay the same.
 *
 * @param world - The world about to run the system or group.
 * @returns Whether the system or group runs (again).
 */
export type RunCondition = (world: EcsWorld) => boolean;
