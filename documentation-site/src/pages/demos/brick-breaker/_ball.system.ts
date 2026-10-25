import { EcsSystem } from '@forge-game-engine/forge/ecs';
import {
  ContactsEcsComponent,
  contactsId,
} from '@forge-game-engine/forge/physics';
import { BallEcsComponent, ballId } from './_ball.component';
import { BrickField } from './_create-bricks';

/**
 * Creates an ECS system that destroys any brick the ball is touching this
 * physics step (via the ball's `ContactsEcsComponent`, filled by
 * `createNarrowPhaseEcsSystem`).
 *
 * Register it in the fixed-update group after `createNarrowPhaseEcsSystem`,
 * so it checks the contacts of the step it runs in. A system in the default
 * group would only see the contacts of the frame's last step, and miss a
 * brick the ball touched in an earlier step and bounced away from.
 * @param brickField - The brick field, used to check/destroy bricks the
 * ball is touching.
 */
export const createBallEcsSystem = (
  brickField: BrickField,
): EcsSystem<[BallEcsComponent, ContactsEcsComponent]> => ({
  query: [ballId, contactsId],
  update: (_world, { components: [, contacts] }) => {
    for (const ballContacts of contacts) {
      for (const otherEntity of ballContacts.touching) {
        if (brickField.has(otherEntity)) {
          brickField.destroy(otherEntity);
        }
      }
    }
  },
});
