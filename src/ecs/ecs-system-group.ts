/**
 * A named collection of systems that run together as a unit inside an
 * `EcsWorld`. Groups are ordered relative to each other with
 * `EcsWorld.addSystemGroup`'s `before`/`after` options; every system
 * registered into a group (via `EcsWorld.addSystem`'s `group` option) runs
 * in that group's place in the world's execution order, ordered against
 * other systems in the same group by its own `before`/`after` options.
 */
export interface EcsSystemGroup {
  /**
   * A human-readable name, used to identify the group in error messages.
   */
  readonly name: string;
}

/**
 * Creates a named system group to register with `EcsWorld.addSystemGroup`.
 * @param name - A human-readable name, used to identify the group in error messages.
 * @returns The system group.
 */
export const createSystemGroup = (name: string): EcsSystemGroup => ({ name });
