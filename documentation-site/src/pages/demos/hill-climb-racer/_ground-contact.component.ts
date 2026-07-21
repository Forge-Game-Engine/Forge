import { createComponentId, EcsWorld } from '@forge-game-engine/forge/ecs';
import { RigidBody } from '@forge-game-engine/forge/physics';

/**
 * Tracks how many static (ground) bodies `frontWheelBody`/`rearWheelBody`
 * are each currently touching, maintained by `createGroundContactEcsSystem`
 * from `PhysicsWorld.collisionStarts`/`collisionEnds`. A count rather than a
 * boolean, since a wheel can (and, given how wide the wheels are relative to
 * a ground column, often does) touch two neighboring ground columns at
 * once, and a boolean would flicker "airborne" as one of those two contacts
 * ends while the wheel is still resting on the other.
 *
 * Shared, via a single entity carrying this alongside both
 * `ChassisStabilizerEcsComponent` (which stays out of the way while the
 * player is airborne, so it doesn't fight `AirControlEcsComponent`'s
 * deliberate tilt input) and `AirControlEcsComponent` (which only acts while
 * airborne), so both react to the same grounded state instead of each
 * maintaining (and potentially disagreeing about) their own.
 */
export interface GroundContactEcsComponent {
  frontWheelBody: RigidBody;
  rearWheelBody: RigidBody;
  frontWheelGroundContacts: number;
  rearWheelGroundContacts: number;
}

export const groundContactId =
  createComponentId<GroundContactEcsComponent>('groundContact');

/**
 * Returns whether `groundContact` currently reports neither wheel touching
 * the ground.
 * @param groundContact - The ground-contact state to check.
 */
export function isAirborne(groundContact: GroundContactEcsComponent): boolean {
  return (
    groundContact.frontWheelGroundContacts === 0 &&
    groundContact.rearWheelGroundContacts === 0
  );
}

/**
 * Attaches a {@link GroundContactEcsComponent} to `entity`.
 * @param world - The ECS world `entity` belongs to.
 * @param entity - The entity to attach the component to.
 * @param options - The wheels to track ground contact for.
 * `frontWheelGroundContacts`/`rearWheelGroundContacts` are initialized to
 * `0` rather than taken from the caller, since they're system-managed
 * state, not configuration.
 * @returns The attached component.
 */
export function addGroundContactComponent(
  world: EcsWorld,
  entity: number,
  options: Pick<GroundContactEcsComponent, 'frontWheelBody' | 'rearWheelBody'>,
): GroundContactEcsComponent {
  return world.addComponent(entity, groundContactId, {
    ...options,
    frontWheelGroundContacts: 0,
    rearWheelGroundContacts: 0,
  });
}
