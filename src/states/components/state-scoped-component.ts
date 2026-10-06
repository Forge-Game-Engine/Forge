import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';
import { GameState } from '../game-state.js';

/**
 * Fields of {@link StateScopedEcsComponent} with no sensible default;
 * callers must always provide these.
 */
export interface StateScopedRequiredOptions<TName extends string = string> {
  /**
   * The game state whose transitions remove the entity.
   */
  state: GameState<TName>;
}

/**
 * Fields of {@link StateScopedEcsComponent} with a sensible default; callers
 * may omit these, as long as one of them isn't empty.
 */
export interface StateScopedDefaultedOptions<TName extends string = string> {
  /**
   * The entity is removed when `state` leaves any of these states.
   */
  removeOnExit: readonly TName[];

  /**
   * The entity is removed when `state` enters any of these states. Use it
   * for content that should stay on screen after its state ends, such as a
   * round's leftovers behind a game-over screen, and go once the next round
   * or the menu starts.
   */
  removeOnEnter: readonly TName[];
}

/**
 * ECS-style component interface that ties an entity's lifetime to a
 * {@link GameState}. The state's transition removes the entity, between
 * the state's `exitGroup` and `enterGroup`.
 */
export interface StateScopedEcsComponent<TName extends string = string>
  extends
    StateScopedRequiredOptions<TName>,
    StateScopedDefaultedOptions<TName> {}

export const stateScopedId =
  createComponentId<StateScopedEcsComponent>('stateScoped');

const defaultStateScopedOptions: StateScopedDefaultedOptions<never> = {
  removeOnExit: [],
  removeOnEnter: [],
};

/**
 * Attaches a {@link StateScopedEcsComponent} to `entity`, so it's removed
 * when `state` leaves one of `removeOnExit` or enters one of
 * `removeOnEnter`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The state, and the transitions that remove the entity.
 * @returns The attached component.
 * @throws An error if both `removeOnExit` and `removeOnEnter` are empty,
 * since the entity would never be removed.
 */
export function addStateScopedComponent<TName extends string>(
  world: EcsWorld,
  entity: number,
  options: StateScopedRequiredOptions<TName> &
    Partial<StateScopedDefaultedOptions<TName>>,
): StateScopedEcsComponent<TName> {
  const component: StateScopedEcsComponent<TName> = {
    ...defaultStateScopedOptions,
    ...options,
  };

  if (
    component.removeOnExit.length === 0 &&
    component.removeOnEnter.length === 0
  ) {
    throw new Error(
      `Unable to add a state-scoped component to entity "${entity}", neither "removeOnExit" nor "removeOnEnter" lists a state, so it would never be removed.`,
    );
  }

  world.addComponent<StateScopedEcsComponent>(entity, stateScopedId, component);

  return component;
}
