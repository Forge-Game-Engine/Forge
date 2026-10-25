import { createComponentId } from '../../ecs/ecs-component.js';
import { EcsWorld } from '../../ecs/ecs-world.js';

/**
 * The entities a collider entity is touching, and which of those contacts
 * started or ended in the latest physics step. Output only:
 * `createNarrowPhaseEcsSystem` writes all three lists every step, replacing
 * each with a new array, so holding on to one of them keeps that step's
 * contents. Contacts are opt-in: only collider entities with this component
 * have theirs recorded.
 *
 * Register the physics systems in the fixed-update group
 * (`registerFixedUpdate`), and a system that reacts to `started` or `ended`
 * in the same group, after `createNarrowPhaseEcsSystem`. A frame can run
 * several steps or none, so a system that runs once per frame misses a
 * contact that started in an earlier step of the frame and sees the same
 * `started` again on a frame with no step. `touching` is the state after
 * the latest step and can be read from any group.
 *
 * Every overlap counts, including one with a sensor collider (which is
 * never resolved) and one with a body this entity is resting on. A
 * sleeping body's contacts persist while it sleeps: the narrow phase reuses
 * them without testing them again, so a crate asleep on the floor keeps the
 * floor in `touching` and reports nothing in `started` or `ended`.
 */
export interface ContactsEcsComponent {
  /**
   * The entities this one is touching this step, each listed once (even
   * when the pair produced several collision manifolds, such as a body
   * resting across two of a terrain's edges). Another system may remove
   * one of them after the narrow phase ran, so check `world.isAlive(entity)`
   * if an earlier system could have.
   */
  touching: readonly number[];

  /**
   * The entities in {@link ContactsEcsComponent.touching} that weren't
   * touching this one in the previous step.
   */
  started: readonly number[];

  /**
   * The entities that were touching this one in the previous step and
   * aren't any more: they moved apart, lost their collider, or were
   * removed. Check
   * `world.isAlive(entity)` before treating one as still existing.
   */
  ended: readonly number[];
}

export const contactsId = createComponentId<ContactsEcsComponent>('contacts');

/**
 * Attaches an empty {@link ContactsEcsComponent} to `entity`, so
 * `createNarrowPhaseEcsSystem` records what its collider touches.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @returns The attached component, for reading its contacts later.
 */
export function addContactsComponent(
  world: EcsWorld,
  entity: number,
): ContactsEcsComponent {
  const component: ContactsEcsComponent = {
    touching: [],
    started: [],
    ended: [],
  };

  return world.addComponent(entity, contactsId, component);
}
