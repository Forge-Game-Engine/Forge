import { createSystemGroup, EcsSystemGroup, EcsWorld } from '../ecs/index.js';
import { createStateScopedRemovalEcsSystem } from './systems/state-scoped-removal-system.js';
import {
  createStateTransitionEcsSystem,
  GameStateStore,
} from './systems/state-transition-system.js';

/**
 * A named top-level state of a game (loading, menu, playing, paused, game
 * over, ...), switched at the start of a tick. Create one with
 * {@link createGameState}, gate systems on it with `inState`, and set up or
 * tear down a state with `onEnter`/`onExit` systems in its `enterGroup` and
 * `exitGroup`.
 *
 * @typeParam TName - The names of the states.
 */
export interface GameState<TName extends string> {
  /**
   * The current state.
   */
  readonly current: TName;

  /**
   * The state entered at the start of this tick, or `null` on ticks
   * without a transition. On the first tick, it's the initial state.
   */
  readonly entered: TName | null;

  /**
   * The state left at the start of this tick, or `null` on ticks without a
   * transition (and on the first tick).
   */
  readonly exited: TName | null;

  /**
   * Runs right after a transition, before the state's scoped entities are
   * removed. Register `onExit` systems in it, so they can still read what
   * the state is about to tear down.
   */
  readonly exitGroup: EcsSystemGroup;

  /**
   * Runs right after the state's scoped entities are removed, before every
   * other system of the tick. Register `onEnter` systems in it, so a new
   * state is set up before any gameplay system sees it.
   */
  readonly enterGroup: EcsSystemGroup;

  /**
   * Requests a transition, applied at the start of the next tick. If it's
   * called more than once in a tick, the last call wins. Requesting the
   * current state re-enters it: its exit and enter systems run again and
   * its scoped entities are removed, which restarts it.
   * @param next - The state to switch to.
   */
  set(next: TName): void;
}

/**
 * Creates a {@link GameState} owned by `world`, starting in `initial`.
 *
 * Registers, in order at the start of every tick: a transition system in
 * the world's `firstSystemGroup`, which applies the last `set` of the
 * previous tick; the state's `exitGroup`; a system that removes the
 * entities whose `StateScopedEcsComponent` matches the transition; and the
 * state's `enterGroup`. Every other group of the world runs after them, so
 * every system sees the same state for the whole tick.
 *
 * On the first tick, `initial` counts as entered, so its `onEnter` systems
 * run.
 * @param world - The world that applies the state's transitions and runs
 * its exit and enter groups.
 * @param initial - The state to start in.
 * @returns The game state.
 */
export function createGameState<TName extends string>(
  world: EcsWorld,
  initial: TName,
): GameState<TName> {
  const store: GameStateStore<TName> = {
    current: initial,
    entered: null,
    exited: null,
    next: null,
  };

  const exitGroup = createSystemGroup('state-exit');
  const removalGroup = createSystemGroup('state-scoped-removal');
  const enterGroup = createSystemGroup('state-enter');

  const state: GameState<TName> = {
    get current(): TName {
      return store.current;
    },
    get entered(): TName | null {
      return store.entered;
    },
    get exited(): TName | null {
      return store.exited;
    },
    exitGroup,
    enterGroup,
    set(next: TName): void {
      store.next = next;
    },
  };

  world.addSystem(createStateTransitionEcsSystem(store), {
    group: world.firstSystemGroup,
  });

  world.addSystemGroup(exitGroup, {
    after: [world.firstSystemGroup],
    runIf: () => store.exited !== null,
  });
  world.addSystemGroup(removalGroup, {
    after: [exitGroup],
    runIf: () => store.entered !== null,
  });
  world.addSystemGroup(enterGroup, {
    after: [removalGroup],
    runIf: () => store.entered !== null,
  });

  world.addSystem(createStateScopedRemovalEcsSystem(state), {
    group: removalGroup,
  });

  return state;
}
