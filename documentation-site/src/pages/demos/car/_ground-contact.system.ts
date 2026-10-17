import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ContactsEcsComponent,
  contactsId,
  rigidBodyId,
} from '@forge-game-engine/forge/physics';
import {
  GroundContactEcsComponent,
  groundContactId,
} from './_ground-contact.component';

/**
 * Counts how many static bodies each wheel is touching, from the contacts
 * the narrow phase found this tick.
 */
export const createGroundContactEcsSystem = (): EcsSystem<
  [GroundContactEcsComponent, ContactsEcsComponent]
> => ({
  query: [groundContactId, contactsId],
  update: (world, { entities, components: [groundContacts, contacts] }) => {
    for (let i = 0; i < entities.length; i++) {
      groundContacts[i].groundContacts = contacts[i].touching.filter(
        (other) => world.getComponent(other, rigidBodyId) === null,
      ).length;
    }
  },
});
