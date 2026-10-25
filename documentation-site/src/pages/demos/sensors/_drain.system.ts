import { createTagId, EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ContactsEcsComponent,
  contactsId,
} from '@forge-game-engine/forge/physics';

/** Marks the sensor at the bottom of the scene that removes balls. */
export const drainId = createTagId('drain');

/**
 * Creates an ECS system that removes every entity the drain sensor started
 * touching this physics step. Register it in the fixed-update group after
 * `createNarrowPhaseEcsSystem`, which fills the drain's contacts once per
 * step.
 */
export const createDrainEcsSystem = (): EcsSystem<[ContactsEcsComponent]> => ({
  query: [contactsId],
  tags: [drainId],
  update: (world, { components: [contacts] }) => {
    for (const drainContacts of contacts) {
      for (const ball of drainContacts.started) {
        world.removeEntity(ball);
      }
    }
  },
});
