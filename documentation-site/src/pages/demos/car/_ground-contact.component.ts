import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { RigidBody } from '@forge-game-engine/forge/physics';

/**
 * Tracks how many static (ground) bodies `body` is currently touching,
 * maintained by `createGroundContactEcsSystem` from
 * `PhysicsWorld.collisionStarts`/`collisionEnds`. A count rather than a
 * boolean, since a wheel can (and, given how wide the wheels are relative to
 * a ground column, often does) touch two neighboring ground columns at
 * once, and a boolean would flicker "airborne" as one of those two contacts
 * ends while the wheel is still resting on the other.
 *
 * Attached directly to `body`'s own entity, so anything else on that same
 * entity (e.g. `WheelDriveEcsComponent`) can query for it jointly.
 * `AirControlEcsComponent`/`ChassisStabilizerEcsComponent` live on a
 * different entity (the chassis) but need to know about *both* wheels, so
 * they instead hold direct references to each wheel's
 * `GroundContactEcsComponent` - the same "read another body's live state
 * through a held reference" pattern those components already use for
 * `chassisBody`.
 */
export interface GroundContactEcsComponent {
  body: RigidBody;
  groundContacts: number;
}

export const groundContactId =
  createComponentId<GroundContactEcsComponent>('groundContact');

/**
 * Returns whether `groundContact` currently reports `body` touching no
 * ground.
 * @param groundContact - The ground-contact state to check.
 */
export function isGrounded(groundContact: GroundContactEcsComponent): boolean {
  return groundContact.groundContacts > 0;
}

/**
 * Attaches a {@link GroundContactEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The body to track ground contact for.
 * `groundContacts` is initialized to `0` rather than taken from the caller,
 * since it's system-managed state, not configuration.
 * @returns The attached component, so it can be handed to other components
 * that need to read this body's grounded state (see the class doc comment).
 */
export function addGroundContactComponent(
  world: EcsWorld,
  entity: number,
  options: Pick<GroundContactEcsComponent, 'body'>,
): GroundContactEcsComponent {
  return world.addComponent(entity, groundContactId, {
    ...options,
    groundContacts: 0,
  });
}
