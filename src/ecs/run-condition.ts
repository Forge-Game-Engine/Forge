import type { EcsWorld } from './ecs-world.js';

/**
 * Decides whether a system or system group runs this tick. Pass one as
 * `runIf` to `EcsWorld.addSystem` or `EcsWorld.addSystemGroup`. The world
 * calls it each tick just before the system or group would run.
 *
 * A run condition only reads state. It decides when a system runs, never
 * which entities it matches: the system's `query` and `tags` stay the same.
 *
 * @param world - The world about to run the system or group.
 * @returns Whether the system or group runs this tick.
 */
export type RunCondition = (world: EcsWorld) => boolean;
