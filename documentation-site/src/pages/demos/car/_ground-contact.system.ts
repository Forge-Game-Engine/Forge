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
 * Recomputes each matched entity's `GroundContactEcsComponent.groundContacts`
 * from its `ContactsEcsComponent`, counting how many of the entities it's
 * touching are static (no `RigidBodyEcsComponent`) bodies. Must run after
 * `createNarrowPhaseEcsSystem`, which fills the contacts, and before any
 * system that reads a `GroundContactEcsComponent` this same tick
 * (`createWheelDriveEcsSystem`, `createChassisStabilizerEcsSystem`,
 * `createAirControlEcsSystem`).
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
